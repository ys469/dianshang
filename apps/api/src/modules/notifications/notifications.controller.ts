import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard)
@Roles('admin')
export class NotificationsController {
  constructor(@Inject(RuntimeDataService) private readonly runtimeDataService: RuntimeDataService) {}

  @Get()
  getNotifications() {
    return ok(this.runtimeDataService.getNotifications());
  }
}
