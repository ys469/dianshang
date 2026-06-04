import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminModule } from './modules/admin/admin.module';
import { AuthController } from './modules/auth/auth.controller';
import { HomeModule } from './modules/home/home.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { DemoJwtGuard } from './common/demo-jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'smart-member-dev-secret'
    }),
    HomeModule,
    ProductsModule,
    OrdersModule,
    AdminModule
  ],
  controllers: [AuthController],
  providers: [DemoJwtGuard]
})
export class AppModule {}
