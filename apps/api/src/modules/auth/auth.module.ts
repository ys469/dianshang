import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthDbService } from './auth-db.service';
import { SmsCodeStoreService } from './sms-code-store.service';
import { SmsSenderService } from './sms-sender.service';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthDbService, SmsCodeStoreService, SmsSenderService, AuthService],
  exports: [AuthDbService, AuthService]
})
export class AuthModule {}
