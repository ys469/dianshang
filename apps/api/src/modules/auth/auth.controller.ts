import { Body, Controller, Inject, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ok } from '../../common/api-response';

interface LoginBody {
  mobile?: string;
  password?: string;
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(JwtService) private readonly jwtService: JwtService) {}

  @Post('login')
  login(@Body() body: LoginBody) {
    const token = this.jwtService.sign(
      {
        sub: 'u-001',
        mobile: body.mobile ?? '13800000000',
        role: 'member'
      },
      { secret: process.env.JWT_SECRET ?? 'smart-member-dev-secret' }
    );

    return ok({
      token,
      user: {
        id: 'u-001',
        nickname: '星选会员',
        mobile: body.mobile ?? '13800000000',
        memberLevel: '黄金会员'
      }
    });
  }
}
