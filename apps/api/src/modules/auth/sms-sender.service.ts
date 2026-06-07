import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { sms } from 'tencentcloud-sdk-nodejs-sms';
import type { SmsScene } from './auth.dto';

interface SendCodeInput {
  mobile: string;
  scene: SmsScene;
  code: string;
  expiresInSeconds: number;
}

@Injectable()
export class SmsSenderService {
  async sendCode(input: SendCodeInput) {
    const provider = (process.env.SMS_PROVIDER ?? 'mock').trim().toLowerCase();

    if (provider === 'mock') {
      return {
        provider: 'mock',
        debugCode: input.code
      };
    }

    if (provider === 'tencent') {
      await this.sendByTencent(input);
      return {
        provider: 'tencent'
      };
    }

    throw new InternalServerErrorException(`Unsupported SMS provider: ${provider}`);
  }

  private async sendByTencent(input: SendCodeInput) {
    const secretId = this.readRequiredEnv('TENCENTCLOUD_SECRET_ID');
    const secretKey = this.readRequiredEnv('TENCENTCLOUD_SECRET_KEY');
    const smsSdkAppId = this.readRequiredEnv('SMS_TENCENT_APP_ID');
    const signName = this.readRequiredEnv('SMS_TENCENT_SIGN_NAME');
    const templateId =
      input.scene === 'register'
        ? this.readRequiredEnv('SMS_TENCENT_TEMPLATE_ID_REGISTER')
        : input.scene === 'login'
          ? this.readRequiredEnv('SMS_TENCENT_TEMPLATE_ID_LOGIN')
          : this.readRequiredEnv('SMS_TENCENT_TEMPLATE_ID_RESET_PASSWORD');

    const SmsClient = sms.v20210111.Client;
    const client = new SmsClient({
      credential: {
        secretId,
        secretKey
      },
      region: process.env.SMS_TENCENT_REGION ?? 'ap-guangzhou',
      profile: {
        httpProfile: {
          endpoint: 'sms.tencentcloudapi.com'
        }
      }
    });

    const response = await client.SendSms({
      SmsSdkAppId: smsSdkAppId,
      SignName: signName,
      TemplateId: templateId,
      TemplateParamSet: [input.code, String(Math.max(1, Math.ceil(input.expiresInSeconds / 60)))],
      PhoneNumberSet: [`+86${input.mobile}`]
    });

    const firstStatus = response.SendStatusSet?.[0];
    if (!firstStatus || firstStatus.Code !== 'Ok') {
      throw new InternalServerErrorException(firstStatus?.Message ?? '短信发送失败');
    }
  }

  private readRequiredEnv(name: string) {
    const value = process.env[name]?.trim();
    if (!value) {
      throw new InternalServerErrorException(`${name} is required when SMS_PROVIDER=tencent`);
    }

    return value;
  }
}
