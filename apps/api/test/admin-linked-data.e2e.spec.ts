import 'reflect-metadata';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('/admin linked data', () => {
  let app: INestApplication;
  let adminToken = '';
  let memberToken = '';
  const tempDir = join(tmpdir(), 'smart-member-mall-tests');
  const dbFile = join(tempDir, `linked-${Date.now()}.sqlite`);

  beforeAll(async () => {
    mkdirSync(tempDir, { recursive: true });
    process.env.AUTH_DB_FILE = dbFile;
    process.env.JWT_SECRET = 'linked-test-secret';

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
    delete process.env.JWT_SECRET;

    if (existsSync(dbFile)) {
      rmSync(dbFile, { force: true });
    }
  });

  it('lets admins create products and adjust stock from the same product dataset', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categoryId: 'food',
        name: '测试补货礼盒',
        subtitle: '后台新增商品',
        price: 88,
        memberPrice: 72,
        stock: 30,
        tags: ['新品', '补货']
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.name).toBe('测试补货礼盒');
    expect(createResponse.body.data.stock).toBe(30);

    const productId = createResponse.body.data.id as string;

    const adjustResponse = await request(app.getHttpServer())
      .patch(`/admin/products/${productId}/stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ delta: 12 });

    expect(adjustResponse.status).toBe(200);
    expect(adjustResponse.body.data.stock).toBe(42);

    const adminProducts = await request(app.getHttpServer())
      .get('/admin/products')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminProducts.status).toBe(200);
    expect(adminProducts.body.data.some((item: { id: string; stock: number }) => item.id === productId && item.stock === 42)).toBe(true);

    const publicProducts = await request(app.getHttpServer()).get('/products');

    expect(publicProducts.status).toBe(200);
    expect(publicProducts.body.data.some((item: { id: string; stock: number }) => item.id === productId && item.stock === 42)).toBe(true);
  });

  it('creates orders with member contact info and updates product sales metrics', async () => {
    const beforeProducts = await request(app.getHttpServer())
      .get('/admin/products')
      .set('Authorization', `Bearer ${adminToken}`);

    const peachBefore = beforeProducts.body.data.find((item: { id: string }) => item.id === 'p-001');

    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
        consignee: '张三',
        mobile: '13800138000',
        address: '上海市浦东新区张江路 88 号 6 栋 1201',
        items: [{ productId: 'p-001', quantity: 2 }]
      });

    expect(createOrder.status).toBe(201);
    expect(createOrder.body.data.customerMobile).toBe('13800138000');
    expect(createOrder.body.data.address).toContain('张江路');

    const adminOrders = await request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminOrders.status).toBe(200);
    expect(adminOrders.body.data[0].customerMobile).toBe('13800138000');
    expect(adminOrders.body.data[0].address).toContain('张江路');

    const afterProducts = await request(app.getHttpServer())
      .get('/admin/products')
      .set('Authorization', `Bearer ${adminToken}`);

    const peachAfter = afterProducts.body.data.find((item: { id: string }) => item.id === 'p-001');

    expect(peachAfter.stock).toBe(peachBefore.stock - 2);
    expect(peachAfter.sales).toBe(peachBefore.sales + 2);
    expect(peachAfter.todaySold).toBeGreaterThanOrEqual(2);

    const members = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    const member = members.body.data.find((item: { mobile: string }) => item.mobile === '13800138000');
    expect(member.totalOrders).toBeGreaterThanOrEqual(1);
    expect(member.totalSpent).toBeGreaterThan(0);
  });
});
