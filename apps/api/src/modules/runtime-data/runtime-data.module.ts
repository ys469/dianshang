import { Global, Module } from '@nestjs/common';
import { RuntimeDataService } from './runtime-data.service';

@Global()
@Module({
  providers: [RuntimeDataService],
  exports: [RuntimeDataService]
})
export class RuntimeDataModule {}
