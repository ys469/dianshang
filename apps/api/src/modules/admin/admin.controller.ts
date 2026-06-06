import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common';
import { ok } from '../../common/api-response';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { AuthDbService } from '../auth/auth-db.service';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles('admin')
export class AdminController {
  constructor(
    @Inject(RuntimeDataService) private readonly runtimeDataService: RuntimeDataService,
    @Inject(AuthDbService) private readonly authDbService: AuthDbService
  ) {}

  @Get('dashboard/summary')
  getDashboardSummary() {
    return ok(this.runtimeDataService.getDashboardSummary());
  }

  @Get('products')
  getProducts() {
    return ok(this.runtimeDataService.getAdminProducts());
  }

  @Post('products')
  createProduct(
    @Body()
    body: {
      categoryId: string;
      name: string;
      subtitle?: string;
      price: number;
      memberPrice: number;
      stock: number;
      tags?: string[];
      image?: string;
      description?: string;
    }
  ) {
    return ok(this.runtimeDataService.createProduct(body), 'product created');
  }

  @Patch('products/:id/stock')
  updateProductStock(@Param('id') id: string, @Body() body: { delta: number }) {
    return ok(this.runtimeDataService.adjustProductStock(id, body.delta), 'stock updated');
  }

  @Get('orders')
  getOrders() {
    return ok(this.runtimeDataService.getAdminOrders());
  }

  @Get('users')
  getUsers() {
    return ok(this.runtimeDataService.getAdminMembers());
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body()
    body: {
      memberLevel?: string;
      balanceDelta?: number;
      pointsDelta?: number;
      growthDelta?: number;
      couponsDelta?: number;
    }
  ) {
    const updated = this.runtimeDataService.updateMember(id, body);
    const authUserId = this.runtimeDataService.getMemberAuthUserId(id);

    if (authUserId && body.memberLevel?.trim()) {
      this.authDbService.updateMemberLevel(authUserId, body.memberLevel.trim());
    }

    return ok(updated, 'member updated');
  }
}
