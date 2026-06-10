import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomInt } from 'node:crypto';
import { hashPassword, verifyPassword } from '../../common/crypto';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';
import { AuthDbService, type AuthUserRecord } from './auth-db.service';
import { MailSenderService } from './mail-sender.service';
import type {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SendSmsCodeDto,
  SmsLoginDto,
  SmsScene
} from './auth.dto';
import { SmsCodeStoreService } from './sms-code-store.service';
import { SmsSenderService } from './sms-sender.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthDbService) private readonly authDbService: AuthDbService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(RuntimeDataService) private readonly runtimeDataService: RuntimeDataService,
    @Inject(MailSenderService) private readonly mailSenderService: MailSenderService,
    @Inject(SmsCodeStoreService) private readonly smsCodeStoreService: SmsCodeStoreService,
    @Inject(SmsSenderService) private readonly smsSenderService: SmsSenderService
  ) {}

  async sendSmsCode(dto: SendSmsCodeDto) {
    const mobile = dto.mobile.trim();
    const existingUser = await this.authDbService.findByMobile(mobile);

    if (dto.scene === 'register' && existingUser) {
      throw new ConflictException('该手机号已注册');
    }

    if (
      (dto.scene === 'reset_password' || dto.scene === 'login') &&
      (!existingUser || existingUser.role !== 'user')
    ) {
      throw new NotFoundException('该手机号尚未注册');
    }

    const code = this.generateSmsCode();
    const expiresInSeconds = this.smsCodeStoreService.getCodeExpiresSeconds();

    await this.smsCodeStoreService.saveCode(mobile, dto.scene, code);

    const sendResult = await this.smsSenderService.sendCode({
      mobile,
      scene: dto.scene,
      code,
      expiresInSeconds
    });

    return {
      mobile,
      scene: dto.scene,
      expiresInSeconds,
      ...sendResult
    };
  }

  async smsLogin(dto: SmsLoginDto) {
    const mobile = dto.mobile.trim();
    const user = await this.authDbService.findByMobile(mobile);

    if (!user || user.role !== 'user') {
      throw new NotFoundException('该手机号尚未注册');
    }

    await this.assertValidSmsCode(mobile, 'login', dto.smsCode);

    this.runtimeDataService.ensureMemberProfile({
      authUserId: user.id,
      nickname: user.nickname,
      mobile: user.mobile ?? mobile,
      memberLevel: user.memberLevel
    });

    return this.buildAuthPayload(user);
  }

  async register(dto: RegisterDto) {
    this.assertPasswordConfirmation(dto.password, dto.confirmPassword);

    const mobile = dto.mobile.trim();
    const email = dto.email.trim().toLowerCase();
    const nickname = dto.nickname.trim();

    const existingUser = await this.authDbService.findByMobile(mobile);
    if (existingUser) {
      throw new ConflictException('该手机号已注册');
    }

    const existingEmailUser = await this.authDbService.findByEmail(email);
    if (existingEmailUser) {
      throw new ConflictException('该邮箱已被使用');
    }

    const user = await this.authDbService.createUser({
      role: 'user',
      account: mobile,
      mobile,
      email,
      nickname,
      memberLevel: '普通会员',
      passwordHash: hashPassword(dto.password)
    });

    this.runtimeDataService.ensureMemberProfile({
      authUserId: user.id,
      nickname: user.nickname,
      mobile: user.mobile ?? mobile,
      memberLevel: user.memberLevel
    });

    return this.buildAuthPayload(user);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const mobile = dto.mobile.trim();
    const email = dto.email.trim().toLowerCase();
    const user = await this.authDbService.findByMobile(mobile);

    if (!user || user.role !== 'user' || user.email?.toLowerCase() !== email) {
      throw new NotFoundException('手机号与邮箱不匹配');
    }

    const nextPassword = this.generateTemporaryPassword();
    await this.authDbService.updatePassword(user.id, hashPassword(nextPassword));

    let sendResult: Awaited<ReturnType<MailSenderService['sendPasswordReset']>>;

    try {
      sendResult = await this.mailSenderService.sendPasswordReset({
        email,
        mobile,
        nickname: user.nickname,
        newPassword: nextPassword
      });
    } catch (error) {
      await this.authDbService.updatePassword(user.id, user.passwordHash);
      throw error;
    }

    return {
      mobile: user.mobile,
      email,
      nickname: user.nickname,
      ...sendResult
    };
  }

  async changePassword(dto: ChangePasswordDto) {
    this.assertPasswordConfirmation(dto.newPassword, dto.confirmPassword);

    const mobile = dto.mobile.trim();
    const user = await this.authDbService.findByMobile(mobile);

    if (!user || user.role !== 'user' || !verifyPassword(dto.currentPassword, user.passwordHash)) {
      throw new UnauthorizedException('账号或当前密码错误');
    }

    await this.authDbService.updatePassword(user.id, hashPassword(dto.newPassword));

    return {
      mobile: user.mobile,
      nickname: user.nickname
    };
  }

  async login(dto: LoginDto) {
    const account = dto.account.trim();
    const user = await this.authDbService.findByRoleAndAccount(dto.role, account);
    if (!user || !verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException(
        dto.role === 'admin' ? '管理员账号或密码错误' : '账号或密码错误'
      );
    }

    if (user.role === 'user' && user.mobile) {
      this.runtimeDataService.ensureMemberProfile({
        authUserId: user.id,
        nickname: user.nickname,
        mobile: user.mobile,
        memberLevel: user.memberLevel
      });
    }

    return this.buildAuthPayload(user);
  }

  async getCurrentUser(jwtPayload: Record<string, unknown>) {
    const account = String(jwtPayload.account ?? '');
    const role = (jwtPayload.role === 'admin' ? 'admin' : 'user') as 'user' | 'admin';

    const user = await this.authDbService.findByRoleAndAccount(role, account);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      id: user.id,
      role: user.role,
      nickname: user.nickname,
      mobile: user.mobile,
      email: user.email,
      memberLevel: user.memberLevel
    };
  }

  private async assertValidSmsCode(mobile: string, scene: SmsScene, code: string) {
    const isValid = await this.smsCodeStoreService.verifyCode(mobile, scene, code);
    if (!isValid) {
      throw new BadRequestException('短信验证码错误或已失效');
    }
  }

  private buildAuthPayload(user: AuthUserRecord) {
    const token = this.jwtService.sign(
      {
        sub: user.id,
        account: user.account,
        mobile: user.mobile,
        email: user.email,
        nickname: user.nickname,
        memberLevel: user.memberLevel,
        role: user.role
      },
      { secret: process.env.JWT_SECRET ?? 'smart-member-dev-secret' }
    );

    return {
      token,
      user: {
        id: user.id,
        role: user.role,
        nickname: user.nickname,
        mobile: user.mobile,
        email: user.email,
        memberLevel: user.memberLevel
      }
    };
  }

  private assertPasswordConfirmation(password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new BadRequestException('两次输入的密码不一致');
    }
  }

  private generateSmsCode() {
    return randomInt(0, 1000000).toString().padStart(6, '0');
  }

  private generateTemporaryPassword() {
    return `Mall${randomBytes(4).toString('hex')}`;
  }
}
