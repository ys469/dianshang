import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  UseGuards
} from '@nestjs/common';
import { ok } from '../../common/api-response';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { WeChatPayService } from '../payments/wechat-pay.service';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';

interface CreateOrderBody {
  fulfillmentMode: 'delivery' | 'pickup';
  paymentMethod?: 'balance' | 'wechat';
  items?: Array<{ productId: string; quantity: number }>;
  productIds?: string[];
  consignee?: string;
  mobile?: string;
  address?: string;
  pickupSiteId?: string;
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    @Inject(RuntimeDataService) private readonly runtimeDataService: RuntimeDataService,
    private readonly weChatPayService: WeChatPayService
  ) {}

  @Get()
  getOrders(
    @CurrentUser()
    user?: { sub?: string; mobile?: string | null }
  ) {
    return ok(
      this.runtimeDataService.getOrdersForMember(user?.sub ?? null, user?.mobile ?? null)
    );
  }

  @Post()
  createOrder(
    @Body() body: CreateOrderBody,
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
      nickname?: string;
      memberLevel?: string | null;
    }
  ) {
    const items =
      body.items?.map((item) => ({
        productId: item.productId,
        quantity: item.quantity
      })) ??
      body.productIds?.map((productId) => ({
        productId,
        quantity: 1
      })) ??
      [];

    const memberProfile = this.runtimeDataService.getMemberProfile({
      authUserId: user?.sub ?? null,
      mobile: user?.mobile ?? null,
      nickname: user?.nickname,
      memberLevel: user?.memberLevel ?? null
    });

    const customerMobile = body.mobile || memberProfile.contactMobile || user?.mobile || '';
    const customerName =
      body.consignee || memberProfile.defaultConsignee || user?.nickname || '商城用户';
    const address =
      body.address ||
      (body.fulfillmentMode === 'pickup'
        ? body.pickupSiteId || '门店自提点'
        : memberProfile.defaultAddress || '待补充收货地址');

    const newOrder = this.runtimeDataService.createOrder({
      fulfillmentMode: body.fulfillmentMode,
      paymentMethod: body.paymentMethod,
      items,
      customerName,
      customerMobile,
      address,
      memberId: user?.sub ?? null,
      memberLevel: user?.memberLevel ?? '普通会员'
    });

    return ok(newOrder, 'order created');
  }

  @Post(':orderNo/cancel')
  @HttpCode(200)
  async cancelOrder(
    @Param('orderNo') orderNo: string,
    @CurrentUser()
    user?: {
      sub?: string;
      mobile?: string | null;
    }
  ) {
    if (!this.runtimeDataService.canAccessOrder(orderNo, user?.sub ?? null, user?.mobile ?? null)) {
      throw new ForbiddenException('无权撤销该订单');
    }

    const order = this.runtimeDataService.getOrderByOrderNo(orderNo);
    if (
      order &&
      order.paymentMethod === 'wechat' &&
      order.paymentState === 'pending' &&
      process.env.WECHAT_PAY_ENABLED === 'true'
    ) {
      await this.weChatPayService.closeOrder(orderNo);
    }

    return ok(this.runtimeDataService.cancelOrder(orderNo), 'order cancelled');
  }
}
