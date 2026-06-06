import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { WeChatPayService } from './wechat-pay.service';

@Module({
  controllers: [PaymentsController],
  providers: [WeChatPayService],
  exports: [WeChatPayService]
})
export class PaymentsModule {}
