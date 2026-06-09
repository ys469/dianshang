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
  const runtimeFile = join(tempDir, `linked-runtime-${Date.now()}.json`);

  beforeAll(async () => {
    mkdirSync(tempDir, { recursive: true });
    process.env.AUTH_DB_FILE = dbFile;
    process.env.RUNTIME_DATA_FILE = runtimeFile;
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
    delete process.env.RUNTIME_DATA_FILE;
    delete process.env.JWT_SECRET;

    if (existsSync(dbFile)) {
      rmSync(dbFile, { force: true });
    }

    if (existsSync(runtimeFile)) {
      rmSync(runtimeFile, { force: true });
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

  it('persists product image and description across admin and public product views', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categoryId: 'health',
        name: '高钙蛋白营养粉',
        subtitle: '后台新增营养商品',
        description: '适合家庭日常营养补充，支持早餐和运动后饮用。',
        image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1200&q=80',
        price: 128,
        memberPrice: 99,
        stock: 18,
        tags: ['新品', '营养']
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.image).toContain('images.unsplash.com');
    expect(createResponse.body.data.description).toContain('营养补充');

    const productId = createResponse.body.data.id as string;

    const adminProducts = await request(app.getHttpServer())
      .get('/admin/products')
      .set('Authorization', `Bearer ${adminToken}`);

    const adminProduct = adminProducts.body.data.find((item: { id: string }) => item.id === productId);
    expect(adminProduct.image).toContain('images.unsplash.com');
    expect(adminProduct.description).toContain('运动后饮用');

    const productDetail = await request(app.getHttpServer()).get(`/products/${productId}`);

    expect(productDetail.status).toBe(200);
    expect(productDetail.body.data.image).toContain('images.unsplash.com');
    expect(productDetail.body.data.description).toContain('家庭日常营养补充');
  });

  it('initializes a brand-new member profile with zero assets and preserves existing member history', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      mobile: '13900000001',
      email: 'new-member@example.com',
      nickname: '新会员测试',
      password: 'test123456',
      confirmPassword: 'test123456'
    });

    expect(registerResponse.status).toBe(201);
    const newMemberToken = registerResponse.body.data.token as string;

    const newMemberProfile = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${newMemberToken}`);

    expect(newMemberProfile.status).toBe(200);
    expect(newMemberProfile.body.data.balance).toBe(0);
    expect(newMemberProfile.body.data.points).toBe(0);
    expect(newMemberProfile.body.data.coupons).toBe(0);
    expect(newMemberProfile.body.data.growthValue).toBe(0);
    expect(newMemberProfile.body.data.totalOrders).toBe(0);
    expect(newMemberProfile.body.data.totalSpent).toBe(0);

    const existingProfileBefore = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(existingProfileBefore.status).toBe(200);

    const existingLoginAgain = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    expect(existingLoginAgain.status).toBe(200);

    const existingProfileAfter = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${existingLoginAgain.body.data.token as string}`);

    expect(existingProfileAfter.status).toBe(200);
    expect(existingProfileAfter.body.data.balance).toBe(existingProfileBefore.body.data.balance);
    expect(existingProfileAfter.body.data.points).toBe(existingProfileBefore.body.data.points);
    expect(existingProfileAfter.body.data.coupons).toBe(existingProfileBefore.body.data.coupons);
    expect(existingProfileAfter.body.data.totalOrders).toBe(existingProfileBefore.body.data.totalOrders);
    expect(existingProfileAfter.body.data.totalSpent).toBe(existingProfileBefore.body.data.totalSpent);
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
        items: [
          {
            productId: 'p-001',
            quantity: 2,
            pricingSourceType: 'catalog',
            expectedUnitPrice: 49.9
          }
        ]
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

  it('uses updated member delivery contact defaults when placing orders and exposes them to admin views', async () => {
    const updateProfile = await request(app.getHttpServer())
      .patch('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        defaultConsignee: 'Luna Zhang',
        contactMobile: '13911112222',
        defaultAddress: 'Shanghai Pudong Jinke Rd 1888 Building 2 Room 803'
      });

    expect(updateProfile.status).toBe(200);
    expect(updateProfile.body.data.defaultConsignee).toBe('Luna Zhang');
    expect(updateProfile.body.data.contactMobile).toBe('13911112222');
    expect(updateProfile.body.data.defaultAddress).toContain('Jinke Rd 1888');

    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
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
    expect(createOrder.body.data.customerName).toBe('Luna Zhang');
    expect(createOrder.body.data.customerMobile).toBe('13911112222');
    expect(createOrder.body.data.address).toContain('Jinke Rd 1888');

    const adminOrders = await request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminOrders.status).toBe(200);
    expect(
      adminOrders.body.data.some(
        (order: { customerName: string; customerMobile: string; address: string }) =>
          order.customerName === 'Luna Zhang' &&
          order.customerMobile === '13911112222' &&
          order.address.includes('Jinke Rd 1888')
      )
    ).toBe(true);
  });
});
