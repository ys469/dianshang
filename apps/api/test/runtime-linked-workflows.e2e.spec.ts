import 'reflect-metadata';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('/runtime linked workflows', () => {
  let app: INestApplication;
  let adminToken = '';
  let memberToken = '';
  const tempDir = join(tmpdir(), 'smart-member-mall-tests');
  const dbFile = join(tempDir, `runtime-linked-${Date.now()}.sqlite`);

  beforeAll(async () => {
    mkdirSync(tempDir, { recursive: true });
    process.env.AUTH_DB_FILE = dbFile;
    process.env.JWT_SECRET = 'runtime-linked-secret';

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

  it('links member recharge, balance payment, finance records, and admin notifications', async () => {
    const profileBefore = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(profileBefore.status).toBe(200);
    const balanceBefore = profileBefore.body.data.balance as number;
    const ordersBefore = profileBefore.body.data.totalOrders as number;

    const recharge = await request(app.getHttpServer())
      .post('/member/recharge')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ amount: 500 });

    expect(recharge.status).toBe(201);
    expect(recharge.body.data.amount).toBe(500);
    expect(recharge.body.data.bonusAmount).toBe(80);
    expect(recharge.body.data.balanceAfter).toBeCloseTo(balanceBefore + 580, 5);

    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        fulfillmentMode: 'delivery',
        consignee: '李四',
        mobile: '13800138000',
        address: '上海市浦东新区金科路 1888 号 2 栋 803',
        items: [{ productId: 'p-003', quantity: 1 }]
      });

    expect(createOrder.status).toBe(201);

    const profileAfter = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(profileAfter.status).toBe(200);
    expect(profileAfter.body.data.totalOrders).toBe(ordersBefore + 1);
    expect(profileAfter.body.data.balance).toBeCloseTo(balanceBefore + 580 - 109, 5);
    expect(profileAfter.body.data.points).toBeGreaterThan(profileBefore.body.data.points);

    const financeSummary = await request(app.getHttpServer())
      .get('/admin/finance/summary?range=today')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(financeSummary.status).toBe(200);
    expect(financeSummary.body.data.sales).toBeGreaterThan(0);
    expect(financeSummary.body.data.totalRecharge).toBeGreaterThanOrEqual(500);

    const financeTransactions = await request(app.getHttpServer())
      .get('/admin/finance/transactions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(financeTransactions.status).toBe(200);
    expect(financeTransactions.body.data.some((item: { type: string; amount: number }) => item.type === '充值' && item.amount === 580)).toBe(true);
    expect(financeTransactions.body.data.some((item: { type: string; orderNo: string }) => item.type === '收款' && item.orderNo === createOrder.body.data.orderNo)).toBe(true);

    const notifications = await request(app.getHttpServer())
      .get('/admin/notifications')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(notifications.status).toBe(200);
    expect(notifications.body.data.some((item: { content: string }) => item.content.includes(createOrder.body.data.orderNo))).toBe(true);
    expect(notifications.body.data.some((item: { content: string }) => item.content.includes('充值'))).toBe(true);
  });

  it('lets admins adjust member assets and publish marketing activities into live datasets', async () => {
    const members = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(members.status).toBe(200);
    const targetMember = members.body.data.find((item: { mobile: string }) => item.mobile === '13800138000');
    expect(targetMember).toBeTruthy();

    const updateMember = await request(app.getHttpServer())
      .patch(`/admin/users/${targetMember.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        memberLevel: '钻石会员',
        balanceDelta: 66,
        pointsDelta: 30
      });

    expect(updateMember.status).toBe(200);
    expect(updateMember.body.data.memberLevel).toBe('钻石会员');

    const profileAfterUpdate = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(profileAfterUpdate.status).toBe(200);
    expect(profileAfterUpdate.body.data.memberLevel).toBe('钻石会员');
    expect(profileAfterUpdate.body.data.points).toBeGreaterThanOrEqual(targetMember.points + 30);

    const createCoupon = await request(app.getHttpServer())
      .post('/admin/marketing/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: '满 159 减 25',
        threshold: 159,
        discount: 25,
        total: 320
      });

    expect(createCoupon.status).toBe(201);
    expect(createCoupon.body.data.title).toBe('满 159 减 25');

    const createFlashSale = await request(app.getHttpServer())
      .post('/admin/marketing/flash-sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: '晚间秒杀专场',
        productId: 'p-001',
        price: 35.8,
        stock: 18
      });

    expect(createFlashSale.status).toBe(201);
    expect(createFlashSale.body.data.productId).toBe('p-001');

    const marketingCoupons = await request(app.getHttpServer())
      .get('/admin/marketing/coupons')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(marketingCoupons.status).toBe(200);
    expect(marketingCoupons.body.data.some((item: { title: string }) => item.title === '满 159 减 25')).toBe(true);

    const homePayload = await request(app.getHttpServer()).get('/home');

    expect(homePayload.status).toBe(200);
    expect(homePayload.body.data.coupons.some((item: { title: string }) => item.title === '满 159 减 25')).toBe(true);
    expect(homePayload.body.data.sections.some((section: { title: string }) => section.title.includes('秒杀'))).toBe(true);
  });
});
