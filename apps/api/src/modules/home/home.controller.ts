import { Controller, Get, Inject } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(@Inject(HomeService) private readonly homeService: HomeService) {}

  @Get()
  getHome() {
    return ok(this.homeService.getHomePayload());
  }
}
