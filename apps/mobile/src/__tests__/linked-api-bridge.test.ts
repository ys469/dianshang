import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDemoMallStore } from '../h5-preview/store';
import type { HomePayload, MemberProfile } from '../services/api';

const {
  createOrderMock,
  loginMock,
  updateProfileMock
} = vi.hoisted(() => ({
  loginMock: vi.fn(async () => ({
    token: 'member-token',
    user: {
      id: 'u-100',
      role: 'user' as const,
      nickname: 'Real Member',
      mobile: '13800138000',
      memberLevel: 'Gold'
    }
  })),
  createOrderMock: vi.fn(async () => ({
    id: 'o-900',
    orderNo: 'SM900',
    status: '待发货',
    fulfillmentMode: '快递到家',
    payableAmount: 49.9,
    totalAmount: 59.9,
    customerName: 'Real Member',
    customerMobile: '13800138000',
    address: 'Shanghai Pudong Zhangjiang Rd 88',
    createdAt: '2026-06-05 14:00:00',
    itemCount: 1,
    itemSummary: 'Sunshine Peach Gift Box x1',
    items: []
  })),
  updateProfileMock: vi.fn(
    async ({
      defaultConsignee,
      contactMobile,
      defaultAddress
    }: {
      defaultConsignee: string;
      contactMobile: string;
      defaultAddress: string;
    }): Promise<MemberProfile> => ({
      id: 'u-100',
      nickname: 'Real Member',
      mobile: '13800138000',
      memberLevel: 'Gold',
      balance: 520,
      points: 580,
      growthValue: 1200,
      coupons: 4,
      totalOrders: 2,
      totalSpent: 218.9,
      lastOrderAt: '2026-06-05 09:30:00',
      defaultConsignee,
      contactMobile,
      defaultAddress
    })
  )
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
    },
    memberClient: {
      ...actual.memberClient,
      updateProfile: updateProfileMock
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

describe('demo mall API bridge', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    loginMock.mockClear();
    createOrderMock.mockClear();
    updateProfileMock.mockClear();
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
    expect(store.currentUserName).toBe('Real Member');
    expect(store.isAuthenticated).toBe(true);
  });

  it('submits checkout orders through the orders API so admin and user data stay linked', async () => {
    const store = useDemoMallStore();

    await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });
    await store.updateDeliveryProfile({
      defaultConsignee: 'Real Member',
      contactMobile: '13800138000',
      defaultAddress: 'Shanghai Pudong Zhangjiang Rd 88'
    });
    store.walletBalance = 520;
    store.addToCart(sampleProduct);

    const result = await store.checkout();

    expect(createOrderMock).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(store.orders[0].id).toBe('SM900');
  });

  it('saves delivery contact info and uses it when submitting checkout orders', async () => {
    const store = useDemoMallStore();

    await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    const saveResult = await store.updateDeliveryProfile({
      defaultConsignee: 'Luna Zhang',
      contactMobile: '13911112222',
      defaultAddress: 'Shanghai Pudong Jinke Rd 1888 Building 2 Room 803'
    });

    expect(updateProfileMock).toHaveBeenCalledWith({
      defaultConsignee: 'Luna Zhang',
      contactMobile: '13911112222',
      defaultAddress: 'Shanghai Pudong Jinke Rd 1888 Building 2 Room 803'
    });
    expect(saveResult.success).toBe(true);

    store.walletBalance = 520;
    store.addToCart(sampleProduct);
    await store.checkout();

    expect(createOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        consignee: 'Luna Zhang',
        mobile: '13911112222',
        address: 'Shanghai Pudong Jinke Rd 1888 Building 2 Room 803'
      })
    );
  });
});
