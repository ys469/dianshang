import 'reflect-metadata';
import { createCipheriv, createSign, generateKeyPairSync, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';

interface SignedResponseInit {
  body: Record<string, unknown>;
  serial: string;
  privateKeyPem: string;
}

function signMessage(privateKeyPem: string, message: string) {
  const signer = createSign('RSA-SHA256');
  signer.update(message);
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

function buildSignedResponse({ body, serial, privateKeyPem }: SignedResponseInit) {
  const payload = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(12).toString('hex');
  const signature = signMessage(privateKeyPem, `${timestamp}\n${nonce}\n${payload}\n`);

  return new Response(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Wechatpay-Timestamp': timestamp,
      'Wechatpay-Nonce': nonce,
      'Wechatpay-Serial': serial,
      'Wechatpay-Signature': signature
    }
  });
}

function encryptCallbackResource(apiV3Key: string, resource: Record<string, unknown>) {
  const associatedData = 'transaction';
  const nonce = randomBytes(12).toString('hex').slice(0, 12);
  const cipher = createCipheriv(
    'aes-256-gcm',
    Buffer.from(apiV3Key, 'utf8'),
    Buffer.from(nonce, 'utf8')
  );
  cipher.setAAD(Buffer.from(associatedData, 'utf8'));

  const plainText = Buffer.from(JSON.stringify(resource), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plainText), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    algorithm: 'AEAD_AES_256_GCM',
    ciphertext: Buffer.concat([encrypted, tag]).toString('base64'),
    nonce,
    associated_data: associatedData,
    original_type: 'transaction'
  };
}

describe('/payments/wechat', () => {
  let app: INestApplication;
  let memberToken = '';
  let adminToken = '';
  let fetchMock: ReturnType<typeof vi.fn>;

  const tempDir = join(tmpdir(), 'smart-member-mall-tests');
  const dbFile = join(tempDir, `wechat-pay-${Date.now()}.sqlite`);
  const merchantKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const wechatKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const merchantPrivateKeyPem = merchantKeys.privateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString();
  const wechatPrivateKeyPem = wechatKeys.privateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString();
  const wechatPublicKeyPem = wechatKeys.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString();
  const apiV3Key = '0123456789abcdef0123456789abcdef';

  beforeAll(async () => {
    mkdirSync(tempDir, { recursive: true });
    process.env.AUTH_DB_FILE = dbFile;
    process.env.JWT_SECRET = 'wechat-pay-secret';
    process.env.WECHAT_PAY_ENABLED = 'true';
    process.env.WECHAT_PAY_MCH_ID = '1900000109';
    process.env.WECHAT_PAY_APP_ID = 'wx8888888888888888';
    process.env.WECHAT_PAY_NOTIFY_URL = 'https://api.example.com/payments/wechat/notify';
    process.env.WECHAT_PAY_API_V3_KEY = apiV3Key;
    process.env.WECHAT_PAY_MERCHANT_SERIAL_NO = 'merchant-serial-001';
    process.env.WECHAT_PAY_PRIVATE_KEY_PEM = merchantPrivateKeyPem;
    process.env.WECHAT_PAY_PUBLIC_KEY_ID = 'wechat-public-key-001';
    process.env.WECHAT_PAY_PUBLIC_KEY_PEM = wechatPublicKeyPem;

    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const memberLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });
    memberToken = memberLogin.body.data.token;

    const adminLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'admin',
      account: 'admin',
      password: 'admin123'
    });
    adminToken = adminLogin.body.data.token;
  });

  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
    delete process.env.AUTH_DB_FILE;
    delete process.env.JWT_SECRET;
    delete process.env.WECHAT_PAY_ENABLED;
    delete process.env.WECHAT_PAY_MCH_ID;
    delete process.env.WECHAT_PAY_APP_ID;
    delete process.env.WECHAT_PAY_NOTIFY_URL;
    delete process.env.WECHAT_PAY_API_V3_KEY;
    delete process.env.WECHAT_PAY_MERCHANT_SERIAL_NO;
    delete process.env.WECHAT_PAY_PRIVATE_KEY_PEM;
    delete process.env.WECHAT_PAY_PUBLIC_KEY_ID;
    delete process.env.WECHAT_PAY_PUBLIC_KEY_PEM;

    if (existsSync(dbFile)) {
      rmSync(dbFile, { force: true });
    }
  });

  it('creates a native checkout session and only marks the order paid after a verified callback', async () => {
    const profileBefore = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(profileBefore.status).toBe(200);
    const balanceBefore = profileBefore.body.data.balance as number;
    const orderCountBefore = profileBefore.body.data.totalOrders as number;

    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
        paymentMethod: 'wechat',
        consignee: 'Luna Zhang',
        mobile: '13911112222',
        address: 'Shanghai Pudong Jinke Rd 1888 Building 2 Room 803',
        items: [{ productId: 'p-001', quantity: 1 }]
      });

    expect(createOrder.status).toBe(201);
    expect(createOrder.body.data.paymentMethod).toBe('wechat');
    expect(createOrder.body.data.paymentState).toBe('pending');

    const profileAfterCreate = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(profileAfterCreate.body.data.balance).toBe(balanceBefore);
    expect(profileAfterCreate.body.data.totalOrders).toBe(orderCountBefore);

    fetchMock.mockResolvedValueOnce(
      buildSignedResponse({
        serial: 'wechat-public-key-001',
        privateKeyPem: wechatPrivateKeyPem,
        body: {
          code_url: 'weixin://wxpay/bizpayurl?pr=test-qr-code'
        }
      })
    );

    const checkoutSession = await request(app.getHttpServer())
      .post('/payments/wechat/checkout-session')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        orderNo: createOrder.body.data.orderNo,
        channel: 'native',
        payerClientIp: '203.0.113.10'
      });

    expect(checkoutSession.status).toBe(201);
    expect(checkoutSession.body.data.channel).toBe('native');
    expect(checkoutSession.body.data.codeUrl).toContain('weixin://wxpay/');

    const transactionResource = {
      mchid: '1900000109',
      appid: 'wx8888888888888888',
      out_trade_no: createOrder.body.data.orderNo,
      transaction_id: '4200002468202606071234567890',
      trade_state: 'SUCCESS',
      trade_state_desc: 'PAY_SUCCESS',
      success_time: new Date().toISOString(),
      amount: {
        total: 4990,
        payer_total: 4990,
        currency: 'CNY'
      }
    };

    const callbackBody = JSON.stringify({
      id: 'notify-1',
      create_time: new Date().toISOString(),
      resource_type: 'encrypt-resource',
      event_type: 'TRANSACTION.SUCCESS',
      summary: 'payment success',
      resource: encryptCallbackResource(apiV3Key, transactionResource)
    });
    const callbackTimestamp = Math.floor(Date.now() / 1000).toString();
    const callbackNonce = randomBytes(12).toString('hex');
    const callbackSignature = signMessage(
      wechatPrivateKeyPem,
      `${callbackTimestamp}\n${callbackNonce}\n${callbackBody}\n`
    );

    const callback = await request(app.getHttpServer())
      .post('/payments/wechat/notify')
      .set('Content-Type', 'application/json')
      .set('Wechatpay-Timestamp', callbackTimestamp)
      .set('Wechatpay-Nonce', callbackNonce)
      .set('Wechatpay-Serial', 'wechat-public-key-001')
      .set('Wechatpay-Signature', callbackSignature)
      .send(callbackBody);

    expect([200, 204]).toContain(callback.status);

    const memberOrders = await request(app.getHttpServer())
      .get('/member/orders')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(memberOrders.status).toBe(200);
    const paidOrder = memberOrders.body.data.find(
      (item: { orderNo: string }) => item.orderNo === createOrder.body.data.orderNo
    );
    expect(paidOrder.paymentState).toBe('success');
    expect(paidOrder.transactionId).toBe('4200002468202606071234567890');

    const profileAfterPay = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(profileAfterPay.body.data.balance).toBe(balanceBefore);
    expect(profileAfterPay.body.data.totalOrders).toBe(orderCountBefore + 1);
    expect(profileAfterPay.body.data.points).toBeGreaterThan(profileBefore.body.data.points);

    const financeTransactions = await request(app.getHttpServer())
      .get('/admin/finance/transactions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(financeTransactions.status).toBe(200);
    expect(
      financeTransactions.body.data.some(
        (item: { orderNo: string; method: string }) =>
          item.orderNo === createOrder.body.data.orderNo && item.method === '微信支付'
      )
    ).toBe(true);
  });

  it('creates an h5 checkout session for mobile browsers', async () => {
    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
        paymentMethod: 'wechat',
        consignee: 'Mobile Buyer',
        mobile: '13922223333',
        address: 'Shenzhen Nanshan Hi-Tech Park 1001',
        items: [{ productId: 'p-002', quantity: 1 }]
      });

    expect(createOrder.status).toBe(201);

    fetchMock.mockResolvedValueOnce(
      buildSignedResponse({
        serial: 'wechat-public-key-001',
        privateKeyPem: wechatPrivateKeyPem,
        body: {
          h5_url: 'https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?prepay_id=test'
        }
      })
    );

    const checkoutSession = await request(app.getHttpServer())
      .post('/payments/wechat/checkout-session')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        orderNo: createOrder.body.data.orderNo,
        channel: 'h5',
        payerClientIp: '198.51.100.30'
      });

    expect(checkoutSession.status).toBe(201);
    expect(checkoutSession.body.data.channel).toBe('h5');
    expect(checkoutSession.body.data.h5Url).toContain('https://wx.tenpay.com/');
  });
});
