import { Module } from '@nestjs/common';
import { AiSupportService } from './ai-support.service';
import { MemberController } from './member.controller';

@Module({
  controllers: [MemberController],
  providers: [AiSupportService]
})
export class MemberModule {}
