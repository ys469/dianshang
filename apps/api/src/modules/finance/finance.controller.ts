import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';

@Controller('admin/finance')
@UseGuards(JwtAuthGuard)
@Roles('admin')
export class FinanceController {
  constructor(@Inject(RuntimeDataService) private readonly runtimeDataService: RuntimeDataService) {}

  @Get('summary')
  getSummary(@Query('range') range?: 'today' | 'week' | 'month') {
    return ok(this.runtimeDataService.getFinanceSummary(range ?? 'today'));
  }

  @Get('transactions')
  getTransactions(@Query('range') range?: 'today' | 'week' | 'month') {
    return ok(this.runtimeDataService.getFinanceTransactions(range));
  }

  @Get('platform-fees')
  getPlatformFees() {
    return ok(this.runtimeDataService.getPlatformFees());
  }
}
