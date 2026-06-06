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

  beforeAll(async () => {
    mkdirSync(tempDir, { recursive: true });
    process.env.AUTH_DB_FILE = dbFile;
    process.env.JWT_SECRET = 'orders-cancel-secret';

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

    if (existsSync(dbFile)) {
      rmSync(dbFile, { force: true });
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
        items: [{ productId: 'p-001', quantity: 1 }]
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
        items: [{ productId: 'p-002', quantity: 1 }]
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
        items: [{ productId: 'p-001', quantity: 1 }]
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
