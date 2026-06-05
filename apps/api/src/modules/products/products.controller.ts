import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';

@Controller()
export class ProductsController {
  constructor(@Inject(RuntimeDataService) private readonly runtimeDataService: RuntimeDataService) {}

  @Get('categories')
  getCategories() {
    return ok(this.runtimeDataService.getCategories());
  }

  @Get('products')
  getProducts(@Query('categoryId') categoryId?: string) {
    return ok(this.runtimeDataService.getPublicProducts(categoryId));
  }

  @Get('products/:id')
  getProductDetail(@Param('id') id: string) {
    return ok(this.runtimeDataService.getProductDetail(id));
  }
}
