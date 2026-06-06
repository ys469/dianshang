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
import { IsIn, IsIP, IsString } from 'class-validator';
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

  @IsIP()
  payerClientIp!: string;
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
      payerClientIp: body.payerClientIp
    });

    return ok(payload, 'wechat checkout session created');
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
}
