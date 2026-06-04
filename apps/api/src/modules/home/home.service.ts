import { Injectable } from '@nestjs/common';
import { banners, categories, coupons, homeSections } from '../../data/demo-data';

@Injectable()
export class HomeService {
  getHomePayload() {
    return {
      banners,
      categories,
      notice: '欢迎来到智能会员商城系统演示版',
      coupons,
      sections: homeSections
    };
  }
}
