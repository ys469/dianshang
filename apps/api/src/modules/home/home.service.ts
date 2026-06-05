import { Inject, Injectable } from '@nestjs/common';
import { RuntimeDataService } from '../runtime-data/runtime-data.service';

@Injectable()
export class HomeService {
  constructor(@Inject(RuntimeDataService) private readonly runtimeDataService: RuntimeDataService) {}

  getHomePayload() {
    return this.runtimeDataService.getHomePayload();
  }
}
