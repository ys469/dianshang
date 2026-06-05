import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDemoMallStore } from '../h5-preview/store';
import type { HomePayload } from '../services/api';

const { createOrderMock, loginMock } = vi.hoisted(() => ({
  loginMock: vi.fn(async () => ({
    token: 'member-token',
    user: {
      id: 'u-100',
      role: 'user' as const,
      nickname: '真实会员',
      mobile: '13800138000',
      memberLevel: '黄金会员'
    }
  })),
  createOrderMock: vi.fn(async () => ({
    id: 'o-900',
    orderNo: 'SM900',
    status: '待发货',
    fulfillmentMode: '快递到家',
    payableAmount: 49.9,
    totalAmount: 59.9,
    customerName: '真实会员',
    customerMobile: '13800138000',
    address: '上海市浦东新区张江路 88 号',
    createdAt: '2026-06-05 14:00:00',
    itemCount: 1,
    itemSummary: '甄选阳光蜜桃礼盒 x1',
    items: []
  }))
}));

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');

  return {
    ...actual,
    authClient: {
      ...actual.authClient,
      login: loginMock
    },
    ordersClient: {
      create: createOrderMock
    }
  };
});

const sampleProduct: HomePayload['sections'][number]['products'][number] = {
  id: 'p-001',
  name: '甄选阳光蜜桃礼盒',
  price: 59.9,
  memberPrice: 49.9,
  image: 'https://example.com/peach.jpg',
  tags: ['爆款', '会员价']
};

describe('demo mall API bridge', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    loginMock.mockClear();
    createOrderMock.mockClear();
  });

  it('logs in through the real auth client and keeps the returned profile', async () => {
    const store = useDemoMallStore();

    const result = await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    expect(loginMock).toHaveBeenCalledWith('user', '13800138000', 'member123');
    expect(result.success).toBe(true);
    expect(store.currentUserName).toBe('真实会员');
    expect(store.isAuthenticated).toBe(true);
  });

  it('submits checkout orders through the orders API so admin and user data stay linked', async () => {
    const store = useDemoMallStore();

    await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });
    store.addToCart(sampleProduct);

    const result = await store.checkout();

    expect(createOrderMock).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(store.orders[0].id).toBe('SM900');
  });
});
