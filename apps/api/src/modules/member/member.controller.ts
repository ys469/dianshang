import { Body, Controller, Get, Inject, Patch, Post, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';
import { AiSupportService } from './ai-support.service';

@Controller('member')
@UseGuards(JwtAuthGuard)
export class MemberController {
  constructor(
    @Inject(RuntimeDataService) private readonly runtimeDataService: RuntimeDataService,
    private readonly aiSupportService: AiSupportService
  ) {}

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

  @Patch('profile')
  updateProfile(
    @Body()
    body: {
      defaultConsignee?: string;
      contactMobile?: string;
      defaultAddress?: string;
    },
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
      nickname?: string;
      memberLevel?: string | null;
    }
  ) {
    return ok(
      this.runtimeDataService.updateMemberProfile({
        authUserId: user?.sub ?? null,
        mobile: user?.mobile ?? null,
        nickname: user?.nickname,
        memberLevel: user?.memberLevel ?? null,
        defaultConsignee: body.defaultConsignee,
        contactMobile: body.contactMobile,
        defaultAddress: body.defaultAddress
      }),
      'member profile updated'
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

  @Get('coupons')
  getCoupons(
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
    }
  ) {
    return ok(this.runtimeDataService.getCouponsForMember(user?.sub ?? null, user?.mobile ?? null));
  }

  @Post('check-in')
  claimDailyCheckIn(
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
      nickname?: string;
      memberLevel?: string | null;
    }
  ) {
    return ok(
      this.runtimeDataService.claimDailyCheckIn({
        authUserId: user?.sub ?? null,
        mobile: user?.mobile ?? null,
        nickname: user?.nickname,
        memberLevel: user?.memberLevel ?? null
      }),
      'check-in completed'
    );
  }

  @Post('support-chat')
  async supportChat(
    @Body()
    body: {
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
      nickname?: string;
      memberLevel?: string | null;
    }
  ) {
    return ok(
      await this.aiSupportService.reply({
        authUserId: user?.sub ?? null,
        mobile: user?.mobile ?? null,
        nickname: user?.nickname,
        memberLevel: user?.memberLevel ?? null,
        message: body.message,
        history: body.history ?? []
      }),
      'support reply generated'
    );
  }

  @Get('merchant-messages')
  getMerchantMessages(
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
      nickname?: string;
      memberLevel?: string | null;
    }
  ) {
    return ok(
      this.runtimeDataService.getMerchantConversationForMember({
        authUserId: user?.sub ?? null,
        mobile: user?.mobile ?? null,
        nickname: user?.nickname,
        memberLevel: user?.memberLevel ?? null
      })
    );
  }

  @Post('merchant-messages')
  sendMerchantMessage(
    @Body() body: { message: string },
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
      nickname?: string;
      memberLevel?: string | null;
    }
  ) {
    return ok(
      this.runtimeDataService.sendMerchantMessageFromMember({
        authUserId: user?.sub ?? null,
        mobile: user?.mobile ?? null,
        nickname: user?.nickname,
        memberLevel: user?.memberLevel ?? null,
        message: body.message
      }),
      'merchant message sent'
    );
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
