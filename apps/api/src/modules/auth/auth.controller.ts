import { Body, Controller, Get, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { LoginDto, RegisterDto, ResetPasswordDto, SendSmsCodeDto, SmsLoginDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto) {
    return ok(await this.authService.login(body));
  }

  @Post('sms-login')
  @HttpCode(200)
  async smsLogin(@Body() body: SmsLoginDto) {
    return ok(await this.authService.smsLogin(body));
  }

  @Post('send-sms-code')
  @HttpCode(200)
  async sendSmsCode(@Body() body: SendSmsCodeDto) {
    return ok(await this.authService.sendSmsCode(body), 'sms code sent');
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return ok(await this.authService.register(body), 'registered');
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return ok(await this.authService.resetPassword(body), 'password reset');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: Record<string, unknown>) {
    return ok(await this.authService.getCurrentUser(user));
  }
}
