import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'node:crypto';
import { hashPassword, verifyPassword } from '../../common/crypto';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';
import { AuthDbService, type AuthUserRecord } from './auth-db.service';
import type { LoginDto, RegisterDto, ResetPasswordDto, SendSmsCodeDto, SmsScene } from './auth.dto';
import { SmsCodeStoreService } from './sms-code-store.service';
import { SmsSenderService } from './sms-sender.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthDbService) private readonly authDbService: AuthDbService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(RuntimeDataService) private readonly runtimeDataService: RuntimeDataService,
    @Inject(SmsCodeStoreService) private readonly smsCodeStoreService: SmsCodeStoreService,
    @Inject(SmsSenderService) private readonly smsSenderService: SmsSenderService
  ) {}

  async sendSmsCode(dto: SendSmsCodeDto) {
    const existingUser = this.authDbService.findByMobile(dto.mobile);

    if (dto.scene === 'register' && existingUser) {
      throw new ConflictException('该手机号已注册');
    }

    if (dto.scene === 'reset_password' && (!existingUser || existingUser.role !== 'user')) {
      throw new NotFoundException('该手机号未注册');
    }

    const code = this.generateSmsCode();
    const expiresInSeconds = this.smsCodeStoreService.getCodeExpiresSeconds();

    await this.smsCodeStoreService.saveCode(dto.mobile, dto.scene, code);

    const sendResult = await this.smsSenderService.sendCode({
      mobile: dto.mobile,
      scene: dto.scene,
      code,
      expiresInSeconds
    });

    return {
      mobile: dto.mobile,
      scene: dto.scene,
      expiresInSeconds,
      ...sendResult
    };
  }

  async register(dto: RegisterDto) {
    this.assertPasswordConfirmation(dto.password, dto.confirmPassword);

    if (this.authDbService.findByMobile(dto.mobile)) {
      throw new ConflictException('该手机号已注册');
    }

    const user = this.authDbService.createUser({
      role: 'user',
      account: dto.mobile,
      mobile: dto.mobile,
      nickname: dto.nickname.trim(),
      memberLevel: '普通会员',
      passwordHash: hashPassword(dto.password)
    });

    this.runtimeDataService.ensureMemberProfile({
      authUserId: user.id,
      nickname: user.nickname,
      mobile: user.mobile ?? dto.mobile,
      memberLevel: user.memberLevel
    });

    return this.buildAuthPayload(user);
  }

  async resetPassword(dto: ResetPasswordDto) {
    this.assertPasswordConfirmation(dto.password, dto.confirmPassword);

    const user = this.authDbService.findByMobile(dto.mobile);

    if (!user || user.role !== 'user') {
      throw new NotFoundException('该手机号未注册');
    }

    await this.assertValidSmsCode(dto.mobile, 'reset_password', dto.smsCode);

    this.authDbService.updatePassword(user.id, hashPassword(dto.password));

    return {
      mobile: user.mobile,
      nickname: user.nickname
    };
  }

  async login(dto: LoginDto) {
    const user = this.authDbService.findByRoleAndAccount(dto.role, dto.account);
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

    const user = this.authDbService.findByRoleAndAccount(role, account);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      id: user.id,
      role: user.role,
      nickname: user.nickname,
      mobile: user.mobile,
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
}
