import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';

@Controller('member')
@UseGuards(JwtAuthGuard)
export class MemberController {
  constructor(@Inject(RuntimeDataService) private readonly runtimeDataService: RuntimeDataService) {}

  @Get('profile')
  getProfile(
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
      nickname?: string;
      memberLevel?: string | null;
    }
  ) {
    return ok(
      this.runtimeDataService.getMemberProfile({
        authUserId: user?.sub ?? null,
        mobile: user?.mobile ?? null,
        nickname: user?.nickname,
        memberLevel: user?.memberLevel ?? null
      })
    );
  }

  @Get('orders')
  getOrders(
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
    }
  ) {
    return ok(this.runtimeDataService.getOrdersForMember(user?.sub ?? null, user?.mobile ?? null));
  }

  @Post('recharge')
  recharge(
    @Body() body: { amount: number },
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
      nickname?: string;
      memberLevel?: string | null;
    }
  ) {
    return ok(
      this.runtimeDataService.rechargeMember({
        authUserId: user?.sub ?? null,
        mobile: user?.mobile ?? null,
        nickname: user?.nickname,
        memberLevel: user?.memberLevel ?? null,
        amount: Number(body.amount)
      }),
      'recharged'
    );
  }
}
