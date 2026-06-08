import 'reflect-metadata';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('/admin operational workflows', () => {
  let app: INestApplication;
  let adminToken = '';
  let memberToken = '';
  const tempDir = join(tmpdir(), 'smart-member-mall-tests');
  const dbFile = join(tempDir, `admin-operations-${Date.now()}.sqlite`);
  const runtimeFile = join(tempDir, `admin-operations-${Date.now()}.json`);

  beforeAll(async () => {
    mkdirSync(tempDir, { recursive: true });
    process.env.AUTH_DB_FILE = dbFile;
    process.env.RUNTIME_DATA_FILE = runtimeFile;
    process.env.JWT_SECRET = 'admin-operations-secret';

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

  it('lets admins update product pricing and take products off shelf without exposing them in the storefront', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categoryId: 'food',
        name: '运营测试鲜果礼盒',
        subtitle: '限量上新',
        description: '用于验证上下架和改价的后台商品。',
        image:
          'https://images.unsplash.com/photo-1471943311424-646960669fbc?auto=format&fit=crop&w=1200&q=80',
        price: 88,
        memberPrice: 72,
        stock: 35,
        tags: ['上新', '运营']
      });

    expect(createResponse.status).toBe(201);
    const productId = createResponse.body.data.id as string;

    const publicProductsBefore = await request(app.getHttpServer()).get('/products');
    expect(publicProductsBefore.status).toBe(200);
    expect(
      publicProductsBefore.body.data.some((item: { id: string }) => item.id === productId)
    ).toBe(true);

    const homeBefore = await request(app.getHttpServer()).get('/home');
    expect(homeBefore.status).toBe(200);
    expect(
      homeBefore.body.data.sections.some((section: { products: Array<{ id: string }> }) =>
        section.products.some((item) => item.id === productId)
      )
    ).toBe(true);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/admin/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        price: 118,
        memberPrice: 96,
        stock: 48,
        listed: false,
        tags: ['已调价', '待复盘']
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.price).toBe(118);
    expect(updateResponse.body.data.memberPrice).toBe(96);
    expect(updateResponse.body.data.stock).toBe(48);
    expect(updateResponse.body.data.listed).toBe(false);

    const publicProductsAfter = await request(app.getHttpServer()).get('/products');
    expect(
      publicProductsAfter.body.data.some((item: { id: string }) => item.id === productId)
    ).toBe(false);

    const homeAfter = await request(app.getHttpServer()).get('/home');
    expect(
      homeAfter.body.data.sections.some((section: { products: Array<{ id: string }> }) =>
        section.products.some((item) => item.id === productId)
      )
    ).toBe(false);

    const relistResponse = await request(app.getHttpServer())
      .patch(`/admin/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        listed: true
      });

    expect(relistResponse.status).toBe(200);
    expect(relistResponse.body.data.listed).toBe(true);
    expect(relistResponse.body.data.price).toBe(118);
    expect(relistResponse.body.data.memberPrice).toBe(96);

    const productDetail = await request(app.getHttpServer()).get(`/products/${productId}`);
    expect(productDetail.status).toBe(200);
    expect(productDetail.body.data.price).toBe(118);
    expect(productDetail.body.data.memberPrice).toBe(96);
  });

  it('lets admins ship and complete paid orders while keeping buyer address and mobile visible', async () => {
    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
        consignee: '王小满',
        mobile: '13955556666',
        address: '上海市浦东新区祖冲之路 288 号 5 栋 601',
        items: [{ productId: 'p-001', quantity: 1, pricingSourceType: 'catalog', expectedUnitPrice: 49.9 }]
      });

    expect(createOrder.status).toBe(201);
    expect(createOrder.body.data.status).toBe('待发货');

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
    expect(shipOrder.body.data.logisticsCompany).toBe('顺丰速运');
    expect(shipOrder.body.data.trackingNo).toBe('SF1234567890');

    const completeOrder = await request(app.getHttpServer())
      .patch(`/admin/orders/${orderNo}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'complete'
      });

    expect(completeOrder.status).toBe(200);
    expect(completeOrder.body.data.status).toBe('已完成');
    expect(completeOrder.body.data.completedAt).toBeTruthy();

    const adminOrders = await request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminOrders.status).toBe(200);

    const targetOrder = adminOrders.body.data.find(
      (item: { orderNo: string }) => item.orderNo === orderNo
    );

    expect(targetOrder.customerName).toBe('王小满');
    expect(targetOrder.customerMobile).toBe('13955556666');
    expect(targetOrder.address).toContain('祖冲之路 288');
    expect(targetOrder.logisticsCompany).toBe('顺丰速运');
    expect(targetOrder.trackingNo).toBe('SF1234567890');
    expect(targetOrder.status).toBe('已完成');
  });

  it('lets admins pause and resume flash sale activities that drive homepage exposure', async () => {
    const createFlashSale = await request(app.getHttpServer())
      .post('/admin/marketing/flash-sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: '运营测试秒杀',
        productId: 'p-003',
        price: 79,
        stock: 12
      });

    expect(createFlashSale.status).toBe(201);
    const flashSaleId = createFlashSale.body.data.id as string;

    const homeBeforePause = await request(app.getHttpServer()).get('/home');
    const flashSaleSectionBeforePause = homeBeforePause.body.data.sections.find(
      (section: { type: string }) => section.type === 'flash_sale'
    );

    expect(
      flashSaleSectionBeforePause.products.some((item: { id: string }) => item.id === 'p-003')
    ).toBe(true);

    const pauseFlashSale = await request(app.getHttpServer())
      .patch(`/admin/marketing/flash-sales/${flashSaleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        enabled: false
      });

    expect(pauseFlashSale.status).toBe(200);
    expect(pauseFlashSale.body.data.status).toBe('已暂停');
    expect(pauseFlashSale.body.data.enabled).toBe(false);

    const homeAfterPause = await request(app.getHttpServer()).get('/home');
    const flashSaleSectionAfterPause = homeAfterPause.body.data.sections.find(
      (section: { type: string }) => section.type === 'flash_sale'
    );

    expect(
      flashSaleSectionAfterPause.products.some((item: { id: string }) => item.id === 'p-003')
    ).toBe(false);

    const resumeFlashSale = await request(app.getHttpServer())
      .patch(`/admin/marketing/flash-sales/${flashSaleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        enabled: true
      });

    expect(resumeFlashSale.status).toBe(200);
    expect(resumeFlashSale.body.data.status).toBe('进行中');
    expect(resumeFlashSale.body.data.enabled).toBe(true);

    const homeAfterResume = await request(app.getHttpServer()).get('/home');
    const flashSaleSectionAfterResume = homeAfterResume.body.data.sections.find(
      (section: { type: string }) => section.type === 'flash_sale'
    );

    expect(
      flashSaleSectionAfterResume.products.some((item: { id: string }) => item.id === 'p-003')
    ).toBe(true);
  });
});
