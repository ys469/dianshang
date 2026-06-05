import { Body, Controller, Get, Inject, Patch, Post, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';

@Controller('admin/marketing')
@UseGuards(JwtAuthGuard)
@Roles('admin')
export class MarketingController {
  constructor(@Inject(RuntimeDataService) private readonly runtimeDataService: RuntimeDataService) {}

  @Get('coupons')
  getCoupons() {
    return ok(this.runtimeDataService.getCoupons());
  }

  @Post('coupons')
  createCoupon(
    @Body()
    body: { title: string; threshold: number; discount: number; total: number }
  ) {
    return ok(this.runtimeDataService.createCoupon(body), 'coupon created');
  }

  @Get('flash-sales')
  getFlashSales() {
    return ok(this.runtimeDataService.getFlashSales());
  }

  @Post('flash-sales')
  createFlashSale(
    @Body()
    body: { title: string; productId: string; price: number; stock: number }
  ) {
    return ok(this.runtimeDataService.createFlashSale(body), 'flash sale created');
  }

  @Get('group-buys')
  getGroupBuys() {
    return ok(this.runtimeDataService.getGroupBuys());
  }

  @Post('group-buys')
  createGroupBuy(
    @Body()
    body: { title: string; productId: string; price: number; groupSize: number }
  ) {
    return ok(this.runtimeDataService.createGroupBuy(body), 'group buy created');
  }

  @Get('checkin-rules')
  getCheckinRules() {
    return ok(this.runtimeDataService.getCheckinRules());
  }

  @Patch('checkin-rules')
  updateCheckinRules(
    @Body()
    body: { rules: Array<{ day: number; reward: string; desc: string }> }
  ) {
    return ok(this.runtimeDataService.updateCheckinRules(body.rules), 'checkin rules updated');
  }
}
