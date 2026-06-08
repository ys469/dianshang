import 'reflect-metadata';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { RuntimeDataService } from '../src/modules/runtime-data/runtime-data.service';

describe('/orders cancel', () => {
  let app: INestApplication;
  let memberToken = '';
  let runtimeDataService: RuntimeDataService;
  const tempDir = join(tmpdir(), 'smart-member-mall-tests');
  const dbFile = join(tempDir, `orders-cancel-${Date.now()}.sqlite`);
  const runtimeFile = join(tempDir, `orders-cancel-runtime-${Date.now()}.json`);

  beforeAll(async () => {
    mkdirSync(tempDir, { recursive: true });
    process.env.AUTH_DB_FILE = dbFile;
    process.env.JWT_SECRET = 'orders-cancel-secret';
    process.env.RUNTIME_DATA_FILE = runtimeFile;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    runtimeDataService = app.get(RuntimeDataService);

    const memberLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });
    memberToken = memberLogin.body.data.token;
  });

  afterAll(async () => {
    await app.close();
    delete process.env.AUTH_DB_FILE;
    delete process.env.JWT_SECRET;
    delete process.env.RUNTIME_DATA_FILE;

    if (existsSync(dbFile)) {
      rmSync(dbFile, { force: true });
    }
    if (existsSync(runtimeFile)) {
      rmSync(runtimeFile, { force: true });
    }
  });

  it('cancels a paid balance order within three minutes and restores member assets', async () => {
    const profileBefore = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(profileBefore.status).toBe(200);

    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
        consignee: 'Luna Zhang',
        mobile: '13911112222',
        address: 'Shanghai Pudong Jinke Rd 1888 Building 2 Room 803',
        items: [{ productId: 'p-001', quantity: 1, pricingSourceType: 'catalog', expectedUnitPrice: 49.9 }]
      });

    expect(createOrder.status).toBe(201);
    expect(createOrder.body.data.status).toBe('\u5f85\u53d1\u8d27');

    const cancelOrder = await request(app.getHttpServer())
      .post(`/orders/${createOrder.body.data.orderNo}/cancel`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(cancelOrder.status).toBe(200);
    expect(cancelOrder.body.data.status).toBe('\u5df2\u53d6\u6d88');
    expect(cancelOrder.body.data.paymentState).toBe('closed');
    expect(cancelOrder.body.data.canCancel).toBe(false);

    const profileAfter = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(profileAfter.status).toBe(200);
    expect(profileAfter.body.data.balance).toBe(profileBefore.body.data.balance);
    expect(profileAfter.body.data.points).toBe(profileBefore.body.data.points);
    expect(profileAfter.body.data.totalOrders).toBe(profileBefore.body.data.totalOrders);
    expect(profileAfter.body.data.totalSpent).toBe(profileBefore.body.data.totalSpent);
  });

  it('uses the active flash sale price when the order comes from the flash sale section', async () => {
    const createdFlashSale = runtimeDataService.createFlashSale({
      title: '测试秒杀价',
      productId: 'p-003',
      price: 79,
      stock: 12
    });

    const homeResponse = await request(app.getHttpServer()).get('/home');

    expect(homeResponse.status).toBe(200);

    const flashSaleSection = homeResponse.body.data.sections.find(
      (section: { type: string }) => section.type === 'flash_sale'
    );
    const flashSaleProduct = flashSaleSection.products.find(
      (product: { id: string; memberPrice: number }) =>
        product.id === 'p-003' && product.memberPrice === createdFlashSale.price
    );
    const runtimeState = runtimeDataService as RuntimeDataService & {
      products: Array<{ id: string; memberPrice: number }>;
    };
    const baseProduct = runtimeState.products.find((product) => product.id === 'p-003');

    expect(flashSaleProduct).toBeTruthy();
    expect(baseProduct).toBeTruthy();
    expect(flashSaleProduct.memberPrice).not.toBe(baseProduct!.memberPrice);

    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
        consignee: 'Flash Sale Buyer',
        mobile: '13900001111',
        address: 'Shanghai Jingan West Nanjing Road 1000',
        items: [
          {
            productId: 'p-003',
            quantity: 1,
            pricingSourceType: 'flash_sale',
            expectedUnitPrice: createdFlashSale.price
          }
        ]
      });

    expect(createOrder.status).toBe(201);
    expect(createOrder.body.data.payableAmount).toBe(flashSaleProduct.memberPrice);
    expect(createOrder.body.data.items[0].memberPrice).toBe(flashSaleProduct.memberPrice);
  });

  it('preserves the displayed flash sale price when a legacy client omits pricingSourceType but still sends the expected unit price', async () => {
    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
        consignee: 'Legacy Flash Buyer',
        mobile: '13900002222',
        address: 'Shanghai Pudong Century Avenue 500',
        items: [{ productId: 'p-001', quantity: 1, expectedUnitPrice: 29.9 }]
      });

    expect(createOrder.status).toBe(201);
    expect(createOrder.body.data.payableAmount).toBe(29.9);
    expect(createOrder.body.data.items[0].memberPrice).toBe(29.9);
  });

  it('keeps homepage pricing and checkout pricing aligned even when the same product has multiple flash sale records', async () => {
    runtimeDataService.createFlashSale({
      title: '晚间秒杀专场',
      productId: 'p-001',
      price: 35.8,
      stock: 12
    });

    const homeResponse = await request(app.getHttpServer()).get('/home');

    expect(homeResponse.status).toBe(200);

    const flashSaleSection = homeResponse.body.data.sections.find(
      (section: { type: string }) => section.type === 'flash_sale'
    );
    const displayedProducts = flashSaleSection.products.filter(
      (product: { id: string }) => product.id === 'p-001'
    );

    expect(displayedProducts).toHaveLength(1);

    const displayedProduct = displayedProducts[0] as {
      id: string;
      memberPrice: number;
      pricingSourceType?: string;
      pricingContextId?: string | null;
    };

    expect(displayedProduct.memberPrice).toBe(35.8);
    expect(displayedProduct.pricingSourceType).toBe('flash_sale');
    expect(displayedProduct.pricingContextId).toBeTruthy();

    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
        consignee: 'Aligned Pricing Buyer',
        mobile: '13900005555',
        address: 'Shanghai Pudong Lujiazui Ring Road 500',
        items: [
          {
            productId: displayedProduct.id,
            quantity: 1,
            pricingSourceType: displayedProduct.pricingSourceType,
            pricingContextId: displayedProduct.pricingContextId,
            expectedUnitPrice: displayedProduct.memberPrice
          }
        ]
      });

    expect(createOrder.status).toBe(201);
    expect(createOrder.body.data.payableAmount).toBe(displayedProduct.memberPrice);
    expect(createOrder.body.data.items[0].memberPrice).toBe(displayedProduct.memberPrice);
  });

  it('rejects checkout when a product with active alternative prices is missing pricing metadata', async () => {
    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
        consignee: 'Stale Client User',
        mobile: '13900003333',
        address: 'Shanghai Hongkou Dalian Road 18',
        items: [{ productId: 'p-001', quantity: 1 }]
      });

    expect(createOrder.status).toBe(400);
    expect(createOrder.body.message).toContain('价格');
  });

  it('applies a selected coupon and reduces the payable amount', async () => {
    const createdCoupon = runtimeDataService.createCoupon({
      title: '测试满99减10',
      threshold: 99,
      discount: 10,
      total: 20
    });

    const profileBefore = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(profileBefore.status).toBe(200);

    if (profileBefore.body.data.coupons < 1) {
      runtimeDataService.updateMember(profileBefore.body.data.id, { couponsDelta: 1 });
    }

    const couponsResponse = await request(app.getHttpServer())
      .get('/member/coupons')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(couponsResponse.status).toBe(200);

    const coupon = couponsResponse.body.data.find(
      (item: { id: string; enabled: boolean; remainingCount: number }) =>
        item.id === createdCoupon.id && item.enabled && item.remainingCount > 0
    );

    expect(coupon).toBeTruthy();

    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
        consignee: 'Coupon Buyer',
        mobile: '13955556666',
        address: 'Shanghai Xuhui Yishan Road 100',
        couponId: coupon.id,
        items: [{ productId: 'p-003', quantity: 1, pricingSourceType: 'catalog', expectedUnitPrice: 109 }]
      });

    expect(createOrder.status).toBe(201);
    expect(createOrder.body.data.couponId).toBe(coupon.id);
    expect(createOrder.body.data.couponDiscount).toBe(coupon.discount);
    expect(createOrder.body.data.payableAmount).toBe(109 - coupon.discount);
  });

  it('cancels a pending wechat order before payment without changing member assets', async () => {
    const profileBefore = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(profileBefore.status).toBe(200);

    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
        paymentMethod: 'wechat',
        consignee: 'Mobile Buyer',
        mobile: '13922223333',
        address: 'Shenzhen Nanshan Hi-Tech Park 1001',
        items: [{ productId: 'p-002', quantity: 1, pricingSourceType: 'catalog', expectedUnitPrice: 32.9 }]
      });

    expect(createOrder.status).toBe(201);
    expect(createOrder.body.data.paymentState).toBe('pending');

    const cancelOrder = await request(app.getHttpServer())
      .post(`/orders/${createOrder.body.data.orderNo}/cancel`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(cancelOrder.status).toBe(200);
    expect(cancelOrder.body.data.status).toBe('\u5df2\u53d6\u6d88');
    expect(cancelOrder.body.data.paymentState).toBe('closed');

    const profileAfter = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(profileAfter.status).toBe(200);
    expect(profileAfter.body.data.balance).toBe(profileBefore.body.data.balance);
    expect(profileAfter.body.data.points).toBe(profileBefore.body.data.points);
    expect(profileAfter.body.data.totalOrders).toBe(profileBefore.body.data.totalOrders);
  });

  it('rejects cancellation after the three-minute revoke window expires', async () => {
    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
        consignee: 'Late Cancel User',
        mobile: '13933334444',
        address: 'Hangzhou Binjiang CBD 1008',
        items: [{ productId: 'p-001', quantity: 1, pricingSourceType: 'catalog', expectedUnitPrice: 49.9 }]
      });

    expect(createOrder.status).toBe(201);

    const runtimeState = runtimeDataService as RuntimeDataService & {
      orders: Array<{ orderNo: string; createdAt: string }>;
    };
    const targetOrder = runtimeState.orders.find(
      (order) => order.orderNo === createOrder.body.data.orderNo
    );

    expect(targetOrder).toBeTruthy();
    targetOrder!.createdAt = new Date(Date.now() - 4 * 60 * 1000).toISOString();

    const cancelOrder = await request(app.getHttpServer())
      .post(`/orders/${createOrder.body.data.orderNo}/cancel`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(cancelOrder.status).toBe(400);
  });
});
