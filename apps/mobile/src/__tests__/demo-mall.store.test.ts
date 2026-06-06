import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { filterProducts, useDemoMallStore } from '../h5-preview/store';
import type { HomePayload, MemberProfile, OrderPayload } from '../services/api';

const {
  createOrderMock,
  getOrdersMock,
  getProfileMock,
  loginMock,
  profileState,
  updateProfileMock
} = vi.hoisted(() => {
  const state: { profile: MemberProfile; orders: OrderPayload[] } = {
    profile: {
      id: 'user-1',
      nickname: 'Formal Member',
      mobile: '13800138000',
      memberLevel: 'Gold',
      balance: 520,
      points: 580,
      growthValue: 1200,
      coupons: 4,
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null,
      defaultConsignee: 'Formal Member',
      contactMobile: '13800138000',
      defaultAddress: ''
    },
    orders: []
  };

  const priceMap: Record<string, number> = {
    'p-001': 49.9,
    'p-002': 109
  };

  return {
    profileState: state,
    loginMock: vi.fn(async (role: 'admin' | 'user', account: string) => ({
      token: `${role}-token`,
      user: {
        id: role === 'admin' ? 'admin-1' : 'user-1',
        role,
        nickname: role === 'admin' ? '运营管理员' : 'Formal Member',
        mobile: role === 'user' ? account : '',
        memberLevel: role === 'user' ? 'Gold' : 'Admin'
      }
    })),
    getProfileMock: vi.fn(async () => ({ ...state.profile })),
    getOrdersMock: vi.fn(async () => state.orders.map((order) => ({ ...order }))),
    updateProfileMock: vi.fn(
      async (payload: {
        defaultConsignee: string;
        contactMobile: string;
        defaultAddress: string;
      }) => {
        state.profile = {
          ...state.profile,
          ...payload
        };
        return { ...state.profile };
      }
    ),
    createOrderMock: vi.fn(
      async ({
        consignee,
        mobile,
        address,
        items
      }: {
        consignee: string;
        mobile: string;
        address: string;
        items: Array<{ productId: string; quantity: number }>;
      }) => {
        const total = Number(
          items.reduce(
            (sum, item) => sum + (priceMap[item.productId] ?? 0) * item.quantity,
            0
          ).toFixed(2)
        );

        state.profile = {
          ...state.profile,
          balance: Number((state.profile.balance - total).toFixed(2)),
          points: state.profile.points + Math.floor(total / 10),
          totalOrders: state.profile.totalOrders + 1,
          totalSpent: Number((state.profile.totalSpent + total).toFixed(2)),
          lastOrderAt: '2026-06-06 10:00:00',
          defaultConsignee: consignee,
          contactMobile: mobile,
          defaultAddress: address
        };

        const order: OrderPayload = {
          id: `o-${state.orders.length + 1}`,
          orderNo: `SM${900 + state.orders.length}`,
          status: '待发货',
          fulfillmentMode: '快递到家',
          payableAmount: total,
          totalAmount: total,
          customerName: consignee,
          customerMobile: mobile,
          address,
          createdAt: '2026-06-06 10:00:00',
          itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
          itemSummary: items.map((item) => `${item.productId} x${item.quantity}`).join(', '),
          items: items.map((item) => ({
            productId: item.productId,
            productName: item.productId,
            quantity: item.quantity,
            price: priceMap[item.productId] ?? 0,
            memberPrice: priceMap[item.productId] ?? 0
          }))
        };

        state.orders = [order, ...state.orders];
        return order;
      }
    )
  };
});

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
      getProfile: getProfileMock,
      getOrders: getOrdersMock,
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

describe('demo mall store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    profileState.profile = {
      id: 'user-1',
      nickname: 'Formal Member',
      mobile: '13800138000',
      memberLevel: 'Gold',
      balance: 520,
      points: 580,
      growthValue: 1200,
      coupons: 4,
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null,
      defaultConsignee: 'Formal Member',
      contactMobile: '13800138000',
      defaultAddress: ''
    };
    profileState.orders = [];
    loginMock.mockClear();
    getProfileMock.mockClear();
    getOrdersMock.mockClear();
    updateProfileMock.mockClear();
    createOrderMock.mockClear();
  });

  it('merges repeated add-to-cart actions into one cart line', () => {
    const store = useDemoMallStore();

    store.addToCart(sampleProduct);
    store.addToCart(sampleProduct);

    expect(store.cart).toHaveLength(1);
    expect(store.cart[0].quantity).toBe(2);
  });

  it('creates an order, clears the cart, and updates member assets on checkout', async () => {
    const store = useDemoMallStore();

    await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });
    await store.updateDeliveryProfile({
      defaultConsignee: 'Luna Zhang',
      contactMobile: '13911112222',
      defaultAddress: 'Shanghai Pudong Jinke Rd 1888 Building 2 Room 803'
    });

    store.addToCart(sampleProduct);
    store.addToCart({
      ...sampleProduct,
      id: 'p-002',
      name: 'Probiotic Gift Box',
      price: 129,
      memberPrice: 109
    });

    const result = await store.checkout();

    expect(result.success).toBe(true);
    expect(store.cart).toHaveLength(0);
    expect(store.orders).toHaveLength(1);
    expect(store.walletBalance).toBeCloseTo(361.1, 5);
    expect(store.points).toBe(595);
  });

  it('only grants the daily sign-in reward once', async () => {
    const store = useDemoMallStore();

    await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    const firstReward = store.claimDailyCheckIn();
    const secondReward = store.claimDailyCheckIn();

    expect(firstReward.success).toBe(true);
    expect(secondReward.success).toBe(false);
    expect(store.points).toBe(600);
  });

  it('filters products by the search keyword', () => {
    const results = filterProducts(
      [
        sampleProduct,
        {
          ...sampleProduct,
          id: 'p-003',
          name: 'Daily Probiotic Pack',
          tags: ['member-only']
        }
      ],
      'probiotic'
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('p-003');
  });

  it('tracks pending and submitted search keywords separately', () => {
    const store = useDemoMallStore();

    store.setSearchDraft('probiotic');
    expect(store.searchQuery).toBe('');

    store.submitSearch();
    expect(store.searchQuery).toBe('probiotic');
  });

  it('supports separate user and admin login states', async () => {
    const store = useDemoMallStore();

    const userResult = await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    expect(userResult.success).toBe(true);
    expect(store.isAuthenticated).toBe(true);
    expect(store.currentRole).toBe('user');

    store.logout();

    const adminResult = await store.login({
      role: 'admin',
      account: 'ops-admin',
      password: 'secret123'
    });

    expect(adminResult.success).toBe(true);
    expect(store.currentRole).toBe('admin');
    expect(store.currentUserName).toBe('运营管理员');
    expect(store.activeAdminShortcut).toBe('products');
  });
});
