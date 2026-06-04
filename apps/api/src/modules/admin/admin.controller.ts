import { Controller, Get, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { DemoJwtGuard } from '../../common/demo-jwt.guard';
import { members, orders, products } from '../../data/demo-data';

@Controller('admin')
@UseGuards(DemoJwtGuard)
export class AdminController {
  @Get('dashboard/summary')
  getDashboardSummary() {
    return ok({
      todaySales: 18680,
      monthlySales: 298600,
      orders: 326,
      members: 2180,
      repurchaseRate: 38.6,
      rechargeAmount: 68000
    });
  }

  @Get('products')
  getProducts() {
    return ok(products);
  }

  @Get('orders')
  getOrders() {
    return ok(orders);
  }

  @Get('users')
  getUsers() {
    return ok(members);
  }
}
