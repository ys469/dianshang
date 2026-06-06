import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from '@nestjs/common';
import { createDecipheriv, createSign, createVerify, randomBytes } from 'node:crypto';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';

interface WeChatPayConfig {
  enabled: boolean;
  mchId: string;
  appId: string;
  notifyUrl: string;
  apiV3Key: string;
  merchantSerialNo: string;
  privateKeyPem: string;
  publicKeyId: string;
  publicKeyPem: string;
}

interface CheckoutSessionInput {
  orderNo: string;
  channel: 'native' | 'h5';
  payerClientIp: string;
}

@Injectable()
export class WeChatPayService {
  constructor(private readonly runtimeDataService: RuntimeDataService) {}

  async createCheckoutSession(input: CheckoutSessionInput) {
    const config = this.getConfig();
    const order = this.runtimeDataService.getOrderByOrderNo(input.orderNo);

    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.paymentMethod !== 'wechat') {
      throw new BadRequestException('该订单不是微信支付订单');
    }

    this.runtimeDataService.setOrderPaymentChannel(input.orderNo, input.channel);

    const requestBody: Record<string, unknown> = {
      appid: config.appId,
      mchid: config.mchId,
      description: order.itemSummary || `商城订单 ${order.orderNo}`,
      out_trade_no: order.orderNo,
      notify_url: config.notifyUrl,
      amount: {
        total: Math.round(order.payableAmount * 100),
        currency: 'CNY'
      }
    };

    if (input.channel === 'h5') {
      requestBody.scene_info = {
        payer_client_ip: input.payerClientIp,
        h5_info: {
          type: 'Wap'
        }
      };
    }

    const path =
      input.channel === 'h5' ? '/v3/pay/transactions/h5' : '/v3/pay/transactions/native';
    const response = await this.requestWeChat('POST', path, requestBody, config);

    return {
      orderNo: input.orderNo,
      channel: input.channel,
      h5Url: typeof response.h5_url === 'string' ? response.h5_url : null,
      codeUrl: typeof response.code_url === 'string' ? response.code_url : null,
      paymentState: order.paymentState
    };
  }

  async getOrderStatus(orderNo: string) {
    const order = this.runtimeDataService.getOrderByOrderNo(orderNo);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.paymentMethod === 'wechat' && order.paymentState === 'pending') {
      try {
        await this.syncOrderStatus(orderNo);
      } catch {
        // Keep local pending state if upstream query is temporarily unavailable.
      }
    }

    return this.runtimeDataService.getOrderByOrderNo(orderNo);
  }

  async closeOrder(orderNo: string) {
    const config = this.getConfig();
    const order = this.runtimeDataService.getOrderByOrderNo(orderNo);

    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.paymentMethod !== 'wechat') {
      throw new BadRequestException('该订单不是微信支付订单');
    }

    const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(orderNo)}/close`;
    await this.requestWeChat('POST', path, { mchid: config.mchId }, config);

    return this.runtimeDataService.getOrderByOrderNo(orderNo);
  }

  async handleNotify(rawBody: string, headers: Record<string, string | string[] | undefined>) {
    const config = this.getConfig();
    this.assertSignature({
      body: rawBody,
      timestamp: this.getHeader(headers, 'wechatpay-timestamp'),
      nonce: this.getHeader(headers, 'wechatpay-nonce'),
      serial: this.getHeader(headers, 'wechatpay-serial'),
      signature: this.getHeader(headers, 'wechatpay-signature'),
      publicKeyId: config.publicKeyId,
      publicKeyPem: config.publicKeyPem
    });

    const payload = JSON.parse(rawBody) as {
      event_type?: string;
      resource?: {
        ciphertext?: string;
        nonce?: string;
        associated_data?: string;
      };
    };

    if (!payload.resource?.ciphertext || !payload.resource.nonce) {
      throw new BadRequestException('invalid wechat pay callback payload');
    }

    const resourcePayload = {
      ciphertext: payload.resource.ciphertext,
      nonce: payload.resource.nonce,
      associated_data: payload.resource.associated_data
    };

    const resource = this.decryptResource(resourcePayload, config.apiV3Key) as {
      out_trade_no?: string;
      transaction_id?: string;
      success_time?: string;
    };

    if (payload.event_type === 'TRANSACTION.SUCCESS' && resource.out_trade_no) {
      this.runtimeDataService.markOrderPaid(resource.out_trade_no, {
        transactionId: resource.transaction_id ?? null,
        paidAt: resource.success_time ?? new Date().toISOString()
      });
    }

    return {
      code: 'SUCCESS',
      message: '成功'
    };
  }

  private async syncOrderStatus(orderNo: string) {
    const config = this.getConfig();
    const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(orderNo)}?mchid=${config.mchId}`;
    const response = await this.requestWeChat('GET', path, undefined, config);

    if (response.trade_state === 'SUCCESS') {
      this.runtimeDataService.markOrderPaid(orderNo, {
        transactionId: typeof response.transaction_id === 'string' ? response.transaction_id : null,
        paidAt: typeof response.success_time === 'string' ? response.success_time : new Date().toISOString()
      });
    }
  }

  private async requestWeChat(
    method: 'GET' | 'POST',
    path: string,
    body: Record<string, unknown> | undefined,
    config: WeChatPayConfig
  ) {
    const bodyText = body ? JSON.stringify(body) : '';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString('hex');
    const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${bodyText}\n`;
    const signature = this.signMessage(config.privateKeyPem, message);
    const authorization =
      `WECHATPAY2-SHA256-RSA2048 mchid=\"${config.mchId}\",` +
      `nonce_str=\"${nonce}\",timestamp=\"${timestamp}\",serial_no=\"${config.merchantSerialNo}\",` +
      `signature=\"${signature}\"`;

    const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authorization
      },
      body: method === 'POST' ? bodyText : undefined
    });

    const responseText = await response.text();
    this.assertResponseSignature(response, responseText, config);

    const payload = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {};
    if (!response.ok) {
      throw new BadGatewayException(
        String(payload.message ?? payload.code ?? 'wechat pay request failed')
      );
    }

    return payload;
  }

  private assertResponseSignature(response: Response, body: string, config: WeChatPayConfig) {
    const timestamp = response.headers.get('Wechatpay-Timestamp');
    const nonce = response.headers.get('Wechatpay-Nonce');
    const serial = response.headers.get('Wechatpay-Serial');
    const signature = response.headers.get('Wechatpay-Signature');

    if (!timestamp || !nonce || !serial || !signature) {
      return;
    }

    this.assertSignature({
      body,
      timestamp,
      nonce,
      serial,
      signature,
      publicKeyId: config.publicKeyId,
      publicKeyPem: config.publicKeyPem
    });
  }

  private assertSignature(input: {
    body: string;
    timestamp: string | null;
    nonce: string | null;
    serial: string | null;
    signature: string | null;
    publicKeyId: string;
    publicKeyPem: string;
  }) {
    if (!input.timestamp || !input.nonce || !input.serial || !input.signature) {
      throw new BadRequestException('missing wechat pay signature headers');
    }
    if (input.serial !== input.publicKeyId) {
      throw new BadRequestException('unexpected wechat pay key id');
    }

    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${input.timestamp}\n${input.nonce}\n${input.body}\n`);
    verifier.end();

    const passed = verifier.verify(input.publicKeyPem, input.signature, 'base64');
    if (!passed) {
      throw new BadRequestException('invalid wechat pay signature');
    }
  }

  private decryptResource(
    resource: {
      ciphertext: string;
      nonce: string;
      associated_data?: string;
    },
    apiV3Key: string
  ) {
    const cipherText = Buffer.from(resource.ciphertext, 'base64');
    const authTag = cipherText.subarray(cipherText.length - 16);
    const encryptedData = cipherText.subarray(0, cipherText.length - 16);
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(apiV3Key, 'utf8'),
      Buffer.from(resource.nonce, 'utf8')
    );

    if (resource.associated_data) {
      decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'));
    }
    decipher.setAuthTag(authTag);

    const plainText = Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString(
      'utf8'
    );

    return JSON.parse(plainText) as Record<string, unknown>;
  }

  private signMessage(privateKeyPem: string, message: string) {
    const signer = createSign('RSA-SHA256');
    signer.update(message);
    signer.end();
    return signer.sign(privateKeyPem, 'base64');
  }

  private getHeader(headers: Record<string, string | string[] | undefined>, key: string) {
    const value = headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];
    return Array.isArray(value) ? value[0] : value ?? null;
  }

  private getConfig(): WeChatPayConfig {
    const enabled = process.env.WECHAT_PAY_ENABLED === 'true';
    const config: WeChatPayConfig = {
      enabled,
      mchId: process.env.WECHAT_PAY_MCH_ID ?? '',
      appId: process.env.WECHAT_PAY_APP_ID ?? '',
      notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL ?? '',
      apiV3Key: process.env.WECHAT_PAY_API_V3_KEY ?? '',
      merchantSerialNo: process.env.WECHAT_PAY_MERCHANT_SERIAL_NO ?? '',
      privateKeyPem: process.env.WECHAT_PAY_PRIVATE_KEY_PEM ?? '',
      publicKeyId: process.env.WECHAT_PAY_PUBLIC_KEY_ID ?? '',
      publicKeyPem: process.env.WECHAT_PAY_PUBLIC_KEY_PEM ?? ''
    };

    if (!config.enabled) {
      throw new ServiceUnavailableException('wechat pay is not enabled');
    }

    const missing = [
      ['WECHAT_PAY_MCH_ID', config.mchId],
      ['WECHAT_PAY_APP_ID', config.appId],
      ['WECHAT_PAY_NOTIFY_URL', config.notifyUrl],
      ['WECHAT_PAY_API_V3_KEY', config.apiV3Key],
      ['WECHAT_PAY_MERCHANT_SERIAL_NO', config.merchantSerialNo],
      ['WECHAT_PAY_PRIVATE_KEY_PEM', config.privateKeyPem],
      ['WECHAT_PAY_PUBLIC_KEY_ID', config.publicKeyId],
      ['WECHAT_PAY_PUBLIC_KEY_PEM', config.publicKeyPem]
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length) {
      throw new ServiceUnavailableException(
        `wechat pay config missing: ${missing.join(', ')}`
      );
    }

    if (config.apiV3Key.length !== 32) {
      throw new ServiceUnavailableException('WECHAT_PAY_API_V3_KEY must be 32 characters');
    }

    return config;
  }
}
