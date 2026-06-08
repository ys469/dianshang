import 'reflect-metadata';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('/member order fulfillment linkage', () => {
  let app: INestApplication;
  let adminToken = '';
  let memberToken = '';
  const tempDir = join(tmpdir(), 'smart-member-mall-tests');
  const dbFile = join(tempDir, `member-order-fulfillment-${Date.now()}.sqlite`);
  const runtimeFile = join(tempDir, `member-order-fulfillment-${Date.now()}.json`);

  beforeAll(async () => {
    mkdirSync(tempDir, { recursive: true });
    process.env.AUTH_DB_FILE = dbFile;
    process.env.RUNTIME_DATA_FILE = runtimeFile;
    process.env.JWT_SECRET = 'member-order-fulfillment-secret';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const adminLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'admin',
      account: 'admin',
      password: 'admin123'
    });
    adminToken = adminLogin.body.data.token;

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
    delete process.env.RUNTIME_DATA_FILE;
    delete process.env.JWT_SECRET;

    if (existsSync(dbFile)) {
      rmSync(dbFile, { force: true });
    }

    if (existsSync(runtimeFile)) {
      rmSync(runtimeFile, { force: true });
    }
  });

  it('shows shipping and completion updates in the member order list after admin actions', async () => {
    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
        consignee: 'Luna Zhang',
        mobile: '13911112222',
        address: 'Shanghai Pudong Jinke Rd 1888 Building 2 Room 803',
        items: [
          {
            productId: 'p-001',
            quantity: 1,
            pricingSourceType: 'catalog',
            expectedUnitPrice: 49.9
          }
        ]
      });

    expect(createOrder.status).toBe(201);
    const orderNo = createOrder.body.data.orderNo as string;

    const shipOrder = await request(app.getHttpServer())
      .patch(`/admin/orders/${orderNo}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'ship',
        logisticsCompany: '顺丰速运',
        trackingNo: 'SF1234567890'
      });

    expect(shipOrder.status).toBe(200);
    expect(shipOrder.body.data.status).toBe('待收货');

    const memberOrdersAfterShip = await request(app.getHttpServer())
      .get('/member/orders')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(memberOrdersAfterShip.status).toBe(200);
    const shippedOrder = memberOrdersAfterShip.body.data.find(
      (item: { orderNo: string }) => item.orderNo === orderNo
    );

    expect(shippedOrder).toBeTruthy();
    expect(shippedOrder.status).toBe('待收货');
    expect(shippedOrder.logisticsCompany).toBe('顺丰速运');
    expect(shippedOrder.trackingNo).toBe('SF1234567890');
    expect(shippedOrder.shippedAt).toBeTruthy();

    const completeOrder = await request(app.getHttpServer())
      .patch(`/admin/orders/${orderNo}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'complete'
      });

    expect(completeOrder.status).toBe(200);
    expect(completeOrder.body.data.status).toBe('已完成');

    const memberOrdersAfterComplete = await request(app.getHttpServer())
      .get('/member/orders')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(memberOrdersAfterComplete.status).toBe(200);
    const completedOrder = memberOrdersAfterComplete.body.data.find(
      (item: { orderNo: string }) => item.orderNo === orderNo
    );

    expect(completedOrder).toBeTruthy();
    expect(completedOrder.status).toBe('已完成');
    expect(completedOrder.completedAt).toBeTruthy();
  });
});
