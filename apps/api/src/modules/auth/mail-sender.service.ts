import { Injectable, InternalServerErrorException } from '@nestjs/common';
import nodemailer from 'nodemailer';

interface SendPasswordResetInput {
  email: string;
  nickname: string;
  mobile: string;
  newPassword: string;
}

@Injectable()
export class MailSenderService {
  async sendPasswordReset(input: SendPasswordResetInput) {
    const provider = (process.env.EMAIL_PROVIDER ?? 'mock').trim().toLowerCase();

    if (provider === 'mock') {
      return {
        provider: 'mock' as const,
        debugPassword: input.newPassword
      };
    }

    if (provider === 'smtp') {
      await this.sendBySmtp(input);
      return {
        provider: 'smtp' as const
      };
    }

    throw new InternalServerErrorException(`Unsupported email provider: ${provider}`);
  }

  private async sendBySmtp(input: SendPasswordResetInput) {
    const host = this.readRequiredEnv('SMTP_HOST');
    const port = Number(process.env.SMTP_PORT ?? 465);
    const secure = String(process.env.SMTP_SECURE ?? 'true').trim().toLowerCase() !== 'false';
    const user = this.readRequiredEnv('SMTP_USER');
    const pass = this.readRequiredEnv('SMTP_PASS');
    const from = this.readRequiredEnv('SMTP_FROM');

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    });

    await transporter.sendMail({
      from,
      to: input.email,
      subject: '智能会员商城密码重置',
      text: [
        `${input.nickname}，您好：`,
        '',
        '系统已为您的会员账号生成新的临时密码。',
        `手机号：${input.mobile}`,
        `临时密码：${input.newPassword}`,
        '',
        '请尽快使用新密码登录，并在登录后修改为您自己的常用密码。'
      ].join('\n')
    });
  }

  private readRequiredEnv(name: string) {
    const value = process.env[name]?.trim();
    if (!value) {
      throw new InternalServerErrorException(`${name} is required when EMAIL_PROVIDER=smtp`);
    }

    return value;
  }
}
