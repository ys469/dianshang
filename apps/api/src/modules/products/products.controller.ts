import { Controller, Get, Param, Query } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { categories, products } from '../../data/demo-data';

@Controller()
export class ProductsController {
  @Get('categories')
  getCategories() {
    return ok(categories);
  }

  @Get('products')
  getProducts(@Query('categoryId') categoryId?: string) {
    return ok(categoryId ? products.filter((item) => item.categoryId === categoryId) : products);
  }

  @Get('products/:id')
  getProductDetail(@Param('id') id: string) {
    return ok(
      products.find((item) => item.id === id) ?? {
        id,
        name: '未找到商品',
        subtitle: '',
        price: 0,
        memberPrice: 0,
        stock: 0,
        sales: 0,
        image: '',
        tags: []
      }
    );
  }
}
