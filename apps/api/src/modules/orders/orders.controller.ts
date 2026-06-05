import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';

interface CreateOrderBody {
  fulfillmentMode: 'delivery' | 'pickup';
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
  constructor(@Inject(RuntimeDataService) private readonly runtimeDataService: RuntimeDataService) {}

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

    const customerMobile = body.mobile || user?.mobile || '';
    const customerName = body.consignee || user?.nickname || '商城用户';
    const address =
      body.address ||
      (body.fulfillmentMode === 'pickup'
        ? body.pickupSiteId || '门店自提点'
        : '待补充收货地址');

    const newOrder = this.runtimeDataService.createOrder({
      fulfillmentMode: body.fulfillmentMode,
      items,
      customerName,
      customerMobile,
      address,
      memberId: user?.sub ?? null,
      memberLevel: user?.memberLevel ?? '普通会员'
    });

    return ok(newOrder, 'order created');
  }
}
