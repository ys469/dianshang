import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { IsIn, IsIP, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ok } from '../../common/api-response';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';
import { WeChatPayService } from './wechat-pay.service';

class CreateCheckoutSessionDto {
  @IsString()
  orderNo!: string;

  @IsIn(['native', 'h5'])
  channel!: 'native' | 'h5';

  @IsOptional()
  @IsIP()
  payerClientIp?: string;
}

class CreateRechargeCheckoutSessionDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsIn(['native', 'h5'])
  channel!: 'native' | 'h5';

  @IsOptional()
  @IsIP()
  payerClientIp?: string;
}

@Controller('payments/wechat')
export class PaymentsController {
  constructor(
    private readonly runtimeDataService: RuntimeDataService,
    private readonly weChatPayService: WeChatPayService
  ) {}

  @Post('checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Body() body: CreateCheckoutSessionDto,
    @Req()
    request?: { ip?: string; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string | null } },
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
    }
  ) {
    if (!this.runtimeDataService.canAccessOrder(body.orderNo, user?.sub ?? null, user?.mobile ?? null)) {
      throw new ForbiddenException('无权访问该订单');
    }

    const payload = await this.weChatPayService.createCheckoutSession({
      orderNo: body.orderNo,
      channel: body.channel,
      payerClientIp: this.resolveClientIp(request, body.payerClientIp)
    });

    return ok(payload, 'wechat checkout session created');
  }

  @Post('recharge-session')
  @UseGuards(JwtAuthGuard)
  async createRechargeSession(
    @Body() body: CreateRechargeCheckoutSessionDto,
    @Req()
    request?: { ip?: string; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string | null } },
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
      nickname?: string;
      memberLevel?: string | null;
    }
  ) {
    const payload = await this.weChatPayService.createRechargeCheckoutSession({
      amount: Number(body.amount),
      channel: body.channel,
      payerClientIp: this.resolveClientIp(request, body.payerClientIp),
      member: {
        authUserId: user?.sub ?? null,
        mobile: user?.mobile ?? null,
        nickname: user?.nickname,
        memberLevel: user?.memberLevel ?? null
      }
    });

    return ok(payload, 'wechat recharge session created');
  }

  @Get('orders/:orderNo')
  @UseGuards(JwtAuthGuard)
  async getOrderStatus(
    @Param('orderNo') orderNo: string,
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
    }
  ) {
    if (!this.runtimeDataService.canAccessOrder(orderNo, user?.sub ?? null, user?.mobile ?? null)) {
      throw new ForbiddenException('无权访问该订单');
    }

    return ok(await this.weChatPayService.getOrderStatus(orderNo));
  }

  @Get('recharges/:rechargeNo')
  @UseGuards(JwtAuthGuard)
  async getRechargeStatus(
    @Param('rechargeNo') rechargeNo: string,
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
    }
  ) {
    if (!this.runtimeDataService.canAccessRecharge(rechargeNo, user?.sub ?? null, user?.mobile ?? null)) {
      throw new ForbiddenException('\u65e0\u6743\u8bbf\u95ee\u8be5\u5145\u503c\u8bb0\u5f55');
    }

    return ok(await this.weChatPayService.getRechargeStatus(rechargeNo));
  }

  @Post('notify')
  @HttpCode(200)
  async notify(@Req() request: { rawBody?: Buffer; body?: unknown; headers?: Record<string, string | string[] | undefined> }) {
    const rawBody = Buffer.isBuffer(request.rawBody)
      ? request.rawBody.toString('utf8')
      : typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body ?? {});

    return this.weChatPayService.handleNotify(rawBody, request.headers ?? {});
  }

  private resolveClientIp(
    request?: { ip?: string; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string | null } },
    explicitIp?: string
  ) {
    const forwarded = request?.headers?.['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const candidate =
      explicitIp ??
      forwardedValue?.split(',')[0]?.trim() ??
      request?.ip ??
      request?.socket?.remoteAddress ??
      '127.0.0.1';

    if (candidate.startsWith('::ffff:')) {
      return candidate.slice(7);
    }
    if (candidate === '::1') {
      return '127.0.0.1';
    }

    return candidate;
  }
}
