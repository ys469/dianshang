import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { DemoJwtGuard } from '../../common/demo-jwt.guard';
import { orders } from '../../data/demo-data';

interface CreateOrderBody {
  fulfillmentMode: 'delivery' | 'pickup';
  productIds: string[];
  pickupSiteId?: string;
}

@Controller('orders')
@UseGuards(DemoJwtGuard)
export class OrdersController {
  @Get()
  getOrders() {
    return ok(orders);
  }

  @Post()
  createOrder(@Body() body: CreateOrderBody) {
    const newOrder = {
      id: `o-${orders.length + 1}`.padStart(5, '0'),
      orderNo: `SM${Date.now()}`,
      status: body.fulfillmentMode === 'pickup' ? 'pending_pickup' : 'pending_payment',
      fulfillmentMode: body.fulfillmentMode,
      totalAmount: 99.9,
      payableAmount: 99.9,
      productIds: body.productIds,
      pickupSiteId: body.pickupSiteId ?? null
    };

    orders.unshift(newOrder);

    return ok(newOrder, 'order created');
  }
}
