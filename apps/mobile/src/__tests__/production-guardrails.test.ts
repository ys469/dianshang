import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDemoMallStore } from '../h5-preview/store';
import type { HomePayload } from '../services/api';

const { createOrderMock, loginMock, rechargeMock } = vi.hoisted(() => ({
  loginMock: vi.fn(async () => {
    throw new Error('network down');
  }),
  createOrderMock: vi.fn(async () => {
    throw new Error('order service unavailable');
  }),
  rechargeMock: vi.fn(async () => {
    throw new Error('recharge service unavailable');
  })
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
      ...actual.ordersClient,
      create: createOrderMock
    },
    memberClient: {
      ...actual.memberClient,
      recharge: rechargeMock
    }
  };
});

const sampleProduct: HomePayload['sections'][number]['products'][number] = {
  id: 'p-001',
  name: 'Sunshine Peach Gift Box',
  price: 59.9,
  memberPrice: 49.9,
  image: 'https://example.com/peach.jpg',
  tags: ['hot', 'member']
};

describe('production guardrails', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    loginMock.mockClear();
    createOrderMock.mockClear();
    rechargeMock.mockClear();
  });

  it('does not silently log in with fallback demo credentials when the auth API fails', async () => {
    const store = useDemoMallStore();

    const result = await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    expect(result.success).toBe(false);
    expect(store.isAuthenticated).toBe(false);
  });

  it('does not create a local fake order when the order API fails', async () => {
    const store = useDemoMallStore();
    store.isAuthenticated = true;
    store.currentRole = 'user';
    store.currentUserName = 'Real Member';
    store.currentUserMobile = '13800138000';
    store.defaultConsignee = 'Real Member';
    store.contactMobile = '13800138000';
    store.defaultAddress = 'Shanghai Pudong Zhangjiang Rd 88';
    store.walletBalance = 500;
    store.addToCart(sampleProduct);

    const result = await store.checkout();

    expect(result.success).toBe(false);
    expect(store.orders).toHaveLength(0);
    expect(store.walletBalance).toBe(500);
  });

  it('does not fake a successful recharge when the recharge API fails', async () => {
    const store = useDemoMallStore();
    store.walletBalance = 80;

    const result = await store.recharge(100);

    expect(result.success).toBe(false);
    expect(store.walletBalance).toBe(80);
  });
});
