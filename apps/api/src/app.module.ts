import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HomeModule } from './modules/home/home.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { MemberModule } from './modules/member/member.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { RuntimeDataModule } from './modules/runtime-data/runtime-data.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'smart-member-dev-secret'
    }),
    RuntimeDataModule,
    AuthModule,
    MemberModule,
    HomeModule,
    ProductsModule,
    OrdersModule,
    AdminModule,
    MarketingModule,
    FinanceModule,
    NotificationsModule
  ],
  providers: [JwtAuthGuard]
})
export class AppModule {}
