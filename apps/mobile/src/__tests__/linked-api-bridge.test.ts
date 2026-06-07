import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDemoMallStore } from '../h5-preview/store';
import type {
  HomePayload,
  MemberProfile,
  RechargePayload,
  WechatRechargeSessionPayload
} from '../services/api';

const {
  createOrderMock,
  createRechargeSessionMock,
  claimCheckInMock,
  getProfileMock,
  getRechargeStatusMock,
  loginMock,
  supportChatMock,
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
  getProfileMock: vi.fn(
    async (): Promise<MemberProfile> => ({
      id: 'u-100',
      nickname: 'Real Member',
      mobile: '13800138000',
      memberLevel: 'Gold',
      balance: 80,
      points: 580,
      growthValue: 1200,
      coupons: 4,
      totalOrders: 2,
      totalSpent: 218.9,
      lastOrderAt: '2026-06-05 09:30:00',
      defaultConsignee: 'Real Member',
      contactMobile: '13800138000',
      defaultAddress: 'Shanghai Pudong Zhangjiang Rd 88',
      lastCheckInAt: null,
      checkinStreak: 0
    })
  ),
  createOrderMock: vi.fn(async () => ({
    id: 'o-900',
    orderNo: 'SM900',
    status: '待发货',
    paymentMethod: 'balance' as const,
    paymentState: 'success' as const,
    paymentChannel: 'balance' as const,
    transactionId: null,
    paidAt: '2026-06-05T14:00:00.000Z',
    fulfillmentMode: '快递到家',
    payableAmount: 49.9,
    totalAmount: 59.9,
    customerName: 'Real Member',
    customerMobile: '13800138000',
    address: 'Shanghai Pudong Zhangjiang Rd 88',
    createdAt: '2026-06-05 14:00:00',
    cancelDeadlineAt: '2026-06-05T14:03:00.000Z',
    cancelledAt: null,
    canCancel: true,
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
  ),
  createRechargeSessionMock: vi.fn(
    async (): Promise<WechatRechargeSessionPayload> => ({
      rechargeNo: 'RC100',
      amount: 100,
      bonusAmount: 10,
      actualAmount: 110,
      channel: 'h5',
      h5Url: 'https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?prepay_id=recharge-test',
      codeUrl: null,
      paymentState: 'pending'
    })
  ),
  getRechargeStatusMock: vi.fn(
    async (): Promise<RechargePayload> => ({
      id: 'rc-100',
      rechargeNo: 'RC100',
      amount: 100,
      bonusAmount: 10,
      actualAmount: 110,
      balanceAfter: 190,
      paymentMethod: 'wechat',
      paymentState: 'success',
      paymentChannel: 'h5',
      transactionId: '4200002468202606072234567890',
      paidAt: '2026-06-07T06:00:00.000Z',
      createdAt: '2026-06-07T05:59:00.000Z'
    })
  ),
  claimCheckInMock: vi.fn(async () => ({
    rewardPoints: 20,
    rewardCoupons: 0,
    rewardLabel: '20 积分',
    streak: 1,
    profile: {
      id: 'u-100',
      nickname: 'Real Member',
      mobile: '13800138000',
      memberLevel: 'Gold',
      balance: 80,
      points: 600,
      growthValue: 1200,
      coupons: 4,
      totalOrders: 2,
      totalSpent: 218.9,
      lastOrderAt: '2026-06-05 09:30:00',
      defaultConsignee: 'Real Member',
      contactMobile: '13800138000',
      defaultAddress: 'Shanghai Pudong Zhangjiang Rd 88',
      lastCheckInAt: '2026-06-07T08:00:00.000Z',
      checkinStreak: 1
    } satisfies MemberProfile
  })),
  supportChatMock: vi.fn(async ({ message }: { message: string }) => ({
    reply: `AI客服已收到：${message}`,
    handoffSuggested: false
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
    },
    paymentsClient: {
      createRechargeSession: createRechargeSessionMock,
      getRechargeStatus: getRechargeStatusMock
    },
    memberClient: {
      ...actual.memberClient,
      claimDailyCheckIn: claimCheckInMock,
      getProfile: getProfileMock,
      sendSupportMessage: supportChatMock,
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
    getProfileMock.mockClear();
    createOrderMock.mockClear();
    updateProfileMock.mockClear();
    createRechargeSessionMock.mockClear();
    getRechargeStatusMock.mockClear();
    claimCheckInMock.mockClear();
    supportChatMock.mockClear();
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

  it('starts recharge through the wechat payments api without crediting the wallet early', async () => {
    const store = useDemoMallStore();

    await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    const balanceBefore = store.walletBalance;
    const result = await store.createRechargeSession(100, 'h5', '198.51.100.31');

    expect(createRechargeSessionMock).toHaveBeenCalledWith({
      amount: 100,
      channel: 'h5',
      payerClientIp: '198.51.100.31'
    });
    expect(result.success).toBe(true);
    expect(result.data?.rechargeNo).toBe('RC100');
    expect(store.walletBalance).toBe(balanceBefore);
  });

  it('syncs the member wallet after a recharge payment succeeds', async () => {
    const store = useDemoMallStore();

    await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    getProfileMock.mockResolvedValueOnce({
      id: 'u-100',
      nickname: 'Real Member',
      mobile: '13800138000',
      memberLevel: 'Gold',
      balance: 190,
      points: 580,
      growthValue: 1200,
      coupons: 4,
      totalOrders: 2,
      totalSpent: 218.9,
      lastOrderAt: '2026-06-05 09:30:00',
      defaultConsignee: 'Real Member',
      contactMobile: '13800138000',
      defaultAddress: 'Shanghai Pudong Zhangjiang Rd 88'
    });

    const result = await store.syncRechargeStatus('RC100');

    expect(getRechargeStatusMock).toHaveBeenCalledWith('RC100');
    expect(result.success).toBe(true);
    expect(store.walletBalance).toBe(190);
  });

  it('claims daily check-in through the member api so points persist in member data', async () => {
    const store = useDemoMallStore();

    await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    const result = await store.claimDailyCheckIn();

    expect(claimCheckInMock).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(store.points).toBe(600);
    expect(store.dailyCheckInClaimed).toBe(true);
  });

  it('sends support messages through the ai customer service api and stores the assistant reply', async () => {
    const store = useDemoMallStore();

    await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    const result = await store.sendSupportMessage('我的订单什么时候发货？');

    expect(supportChatMock).toHaveBeenCalledWith({
      message: '我的订单什么时候发货？',
      history: []
    });
    expect(result.success).toBe(true);
    expect(store.supportMessages.at(-1)?.role).toBe('assistant');
    expect(store.supportMessages.at(-1)?.content).toContain('AI客服已收到');
  });
});
