import 'reflect-metadata';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('/runtime data sanitization', () => {
  let app: INestApplication;
  let adminToken = '';
  const tempDir = join(tmpdir(), 'smart-member-mall-tests');
  const dbFile = join(tempDir, `runtime-sanitization-${Date.now()}.sqlite`);
  const runtimeFile = join(tempDir, `runtime-sanitization-${Date.now()}.json`);

  beforeAll(async () => {
    mkdirSync(tempDir, { recursive: true });
    process.env.AUTH_DB_FILE = dbFile;
    process.env.RUNTIME_DATA_FILE = runtimeFile;
    process.env.JWT_SECRET = 'runtime-sanitization-secret';

    const createdAt = new Date().toISOString();
    writeFileSync(
      runtimeFile,
      JSON.stringify(
        {
          products: [
            {
              id: 'p-valid',
              categoryId: 'food',
              name: '甄选黑松露饼干礼盒',
              subtitle: '门店热销伴手礼',
              description: '适合会员礼赠与节日选购。',
              price: 79.9,
              memberPrice: 49.9,
              stock: 12,
              sales: 4,
              image: 'https://example.com/truffle.jpg',
              tags: ['热销'],
              listed: true,
              createdAt,
              updatedAt: createdAt
            },
            {
              id: 'p-junk',
              categoryId: 'food',
              name: '测试补货礼盒',
              subtitle: '后台新增商品',
              description: '',
              price: 88,
              memberPrice: 72,
              stock: 42,
              sales: 0,
              image: 'https://example.com/test.jpg',
              tags: ['新品'],
              listed: true,
              createdAt,
              updatedAt: createdAt
            }
          ],
          orders: [
            {
              id: 'o-valid',
              orderNo: 'SM-VALID-001',
              status: '待发货',
              paymentMethod: 'balance',
              paymentState: 'success',
              paymentChannel: 'balance',
              transactionId: 'BAL-VALID-001',
              paidAt: createdAt,
              fulfillmentMode: 'delivery',
              totalAmount: 79.9,
              payableAmount: 49.9,
              customerName: '正式会员',
              customerMobile: '13811112222',
              address: '上海市浦东新区金科路 1888 号 2 栋 803 室',
              memberId: 'u-valid',
              createdAt,
              cancelledAt: null,
              couponId: null,
              couponTitle: null,
              couponDiscount: 0,
              logisticsCompany: null,
              trackingNo: null,
              shippedAt: null,
              completedAt: null,
              items: [
                {
                  productId: 'p-valid',
                  productName: '甄选黑松露饼干礼盒',
                  quantity: 1,
                  price: 79.9,
                  memberPrice: 49.9,
                  pricingSourceType: 'catalog',
                  pricingContextId: null
                }
              ]
            },
            {
              id: 'o-junk',
              orderNo: 'SM-JUNK-999',
              status: '待发货',
              paymentMethod: 'balance',
              paymentState: 'success',
              paymentChannel: 'balance',
              transactionId: 'BAL-JUNK-999',
              paidAt: createdAt,
              fulfillmentMode: 'delivery',
              totalAmount: 100000000,
              payableAmount: 9999990,
              customerName: '????',
              customerMobile: '13800138000',
              address: '?????????? 88 ?',
              memberId: 'u-junk',
              createdAt,
              cancelledAt: null,
              couponId: null,
              couponTitle: null,
              couponDiscount: 0,
              logisticsCompany: null,
              trackingNo: null,
              shippedAt: null,
              completedAt: null,
              items: [
                {
                  productId: 'p-junk',
                  productName: '特朗普的内裤',
                  quantity: 10,
                  price: 10000000,
                  memberPrice: 999999,
                  pricingSourceType: 'catalog',
                  pricingContextId: null
                }
              ]
            }
          ],
          members: [
            {
              id: 'u-valid',
              authUserId: null,
              nickname: '正式会员',
              mobile: '13811112222',
              memberLevel: '黄金会员',
              balance: 200,
              points: 0,
              growthValue: 0,
              coupons: 0,
              totalOrders: 0,
              totalSpent: 0,
              lastOrderAt: null,
              defaultConsignee: '正式会员',
              contactMobile: '13811112222',
              defaultAddress: '上海市浦东新区金科路 1888 号 2 栋 803 室',
              lastCheckInAt: null,
              checkinStreak: 0
            },
            {
              id: 'u-junk',
              authUserId: null,
              nickname: '新会员测试',
              mobile: '13900000001',
              memberLevel: '普通会员',
              balance: 0,
              points: 0,
              growthValue: 0,
              coupons: 0,
              totalOrders: 0,
              totalSpent: 0,
              lastOrderAt: null,
              defaultConsignee: '测试会员',
              contactMobile: '13900000001',
              defaultAddress: '测试地址',
              lastCheckInAt: null,
              checkinStreak: 0
            }
          ],
          transactions: [
            {
              id: 'tx-valid',
              type: '收款',
              orderNo: 'SM-VALID-001',
              amount: 49.9,
              method: '余额支付',
              createdAt,
              memberId: 'u-valid',
              detail: '正式会员完成订单支付'
            },
            {
              id: 'tx-junk',
              type: '收款',
              orderNo: 'SM-JUNK-999',
              amount: 9999990,
              method: '余额支付',
              createdAt,
              memberId: 'u-junk',
              detail: '测试订单支付'
            }
          ]
        },
        null,
        2
      ),
      'utf8'
    );

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

  it('removes junk runtime records and recomputes linked admin data from the cleaned state', async () => {
    const products = await request(app.getHttpServer())
      .get('/admin/products')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(products.status).toBe(200);
    expect(products.body.data.map((item: { name: string }) => item.name)).toContain(
      '甄选黑松露饼干礼盒'
    );
    expect(products.body.data.map((item: { name: string }) => item.name)).not.toContain(
      '测试补货礼盒'
    );

    const orders = await request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(orders.status).toBe(200);
    expect(orders.body.data).toHaveLength(1);
    expect(orders.body.data[0].orderNo).toBe('SM-VALID-001');

    const members = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(members.status).toBe(200);
    expect(members.body.data).toHaveLength(1);
    expect(members.body.data[0].nickname).toBe('正式会员');
    expect(members.body.data[0].totalOrders).toBe(1);
    expect(members.body.data[0].totalSpent).toBe(49.9);

    const dashboard = await request(app.getHttpServer())
      .get('/admin/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.orders).toBe(1);
    expect(dashboard.body.data.todaySales).toBe(49.9);
  });
});
