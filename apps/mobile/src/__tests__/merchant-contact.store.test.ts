import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDemoMallStore } from '../h5-preview/store';
import type { MemberProfile } from '../services/api';

const {
  getCouponsMock,
  getMerchantMessagesMock,
  getOrdersMock,
  getProfileMock,
  loginMock,
  sendMerchantMessageMock
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
      email: 'member@example.com',
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
  getOrdersMock: vi.fn(async () => []),
  getCouponsMock: vi.fn(async () => []),
  getMerchantMessagesMock: vi.fn(async () => ({
    threadId: 'thread-001',
    memberId: 'u-100',
    merchantName: 'Merchant Team',
    unreadCount: 0,
    updatedAt: '2026-06-07T09:30:00.000Z',
    messages: [
      {
        id: 'msg-001',
        senderRole: 'admin' as const,
        senderId: 'admin-1',
        senderName: 'Merchant Team',
        content: 'Hello, this is the merchant inbox.',
        createdAt: '2026-06-07T09:30:00.000Z',
        readByMember: true,
        readByAdmin: true
      }
    ]
  })),
  sendMerchantMessageMock: vi.fn(async ({ message }: { message: string }) => ({
    threadId: 'thread-001',
    memberId: 'u-100',
    merchantName: 'Merchant Team',
    unreadCount: 1,
    updatedAt: '2026-06-07T09:35:00.000Z',
    messages: [
      {
        id: 'msg-001',
        senderRole: 'admin' as const,
        senderId: 'admin-1',
        senderName: 'Merchant Team',
        content: 'Hello, this is the merchant inbox.',
        createdAt: '2026-06-07T09:30:00.000Z',
        readByMember: true,
        readByAdmin: true
      },
      {
        id: 'msg-002',
        senderRole: 'member' as const,
        senderId: 'u-100',
        senderName: 'Real Member',
        content: message,
        createdAt: '2026-06-07T09:35:00.000Z',
        readByMember: true,
        readByAdmin: false
      }
    ]
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
    memberClient: {
      ...actual.memberClient,
      getProfile: getProfileMock,
      getOrders: getOrdersMock,
      getCoupons: getCouponsMock,
      getMerchantMessages: getMerchantMessagesMock,
      sendMerchantMessage: sendMerchantMessageMock
    }
  };
});

describe('merchant contact store flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    loginMock.mockClear();
    getProfileMock.mockClear();
    getOrdersMock.mockClear();
    getCouponsMock.mockClear();
    getMerchantMessagesMock.mockClear();
    sendMerchantMessageMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads merchant conversations on login and routes replies into the merchant panel', async () => {
    const store = useDemoMallStore();

    const loginResult = await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    expect(loginResult.success).toBe(true);
    expect(getMerchantMessagesMock).toHaveBeenCalled();
    expect(store.merchantMessages[0]).toEqual(
      expect.objectContaining({
        senderRole: 'admin',
        content: 'Hello, this is the merchant inbox.'
      })
    );

    const result = await store.sendMerchantMessage('Please confirm today’s ship time');

    expect(sendMerchantMessageMock).toHaveBeenCalledWith({
      message: 'Please confirm today’s ship time'
    });
    expect(result.success).toBe(true);
    expect(store.activePanel).toBe('merchant');
    expect(store.merchantMessages.at(-1)).toEqual(
      expect.objectContaining({
        senderRole: 'member',
        content: 'Please confirm today’s ship time'
      })
    );
  });

  it('pulls fresh merchant replies into the open panel without requiring a manual refresh', async () => {
    getMerchantMessagesMock
      .mockResolvedValueOnce({
        threadId: 'thread-001',
        memberId: 'u-100',
        merchantName: 'Merchant Team',
        unreadCount: 0,
        updatedAt: '2026-06-07T09:30:00.000Z',
        messages: [
          {
            id: 'msg-001',
            senderRole: 'member' as const,
            senderId: 'u-100',
            senderName: 'Real Member',
            content: 'Hi there',
            createdAt: '2026-06-07T09:30:00.000Z',
            readByMember: true,
            readByAdmin: true
          }
        ]
      })
      .mockResolvedValueOnce({
        threadId: 'thread-001',
        memberId: 'u-100',
        merchantName: 'Merchant Team',
        unreadCount: 1,
        updatedAt: '2026-06-07T09:31:00.000Z',
        messages: [
          {
            id: 'msg-001',
            senderRole: 'member' as const,
            senderId: 'u-100',
            senderName: 'Real Member',
            content: 'Hi there',
            createdAt: '2026-06-07T09:30:00.000Z',
            readByMember: true,
            readByAdmin: true
          },
          {
            id: 'msg-002',
            senderRole: 'admin' as const,
            senderId: 'admin-1',
            senderName: 'Merchant Team',
            content: 'We saw your message and are checking now.',
            createdAt: '2026-06-07T09:31:00.000Z',
            readByMember: false,
            readByAdmin: true
          }
        ]
      });

    const store = useDemoMallStore();
    await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    store.openPanel('merchant');
    store.startMerchantMessagePolling(3000);

    await vi.advanceTimersByTimeAsync(3000);

    expect(getMerchantMessagesMock).toHaveBeenCalledTimes(2);
    expect(store.unreadMessages).toBe(1);
    expect(store.merchantMessages.at(-1)).toEqual(
      expect.objectContaining({
        senderRole: 'admin',
        content: 'We saw your message and are checking now.'
      })
    );

    store.stopMerchantMessagePolling();
  });
});
