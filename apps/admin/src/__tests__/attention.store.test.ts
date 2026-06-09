import { describe, expect, it } from 'vitest';
import {
  buildAdminAttentionSnapshot,
  detectAdminAttentionIncrease
} from '../utils/admin-attention';

describe('admin attention helpers', () => {
  it('summarizes pending orders and unread merchant messages', () => {
    const snapshot = buildAdminAttentionSnapshot(
      [
        { status: '待发货' },
        { status: '待收货' },
        { status: '已完成' },
        { status: '待提货' }
      ],
      [
        { adminUnreadCount: 2 },
        { adminUnreadCount: 0 },
        { adminUnreadCount: 1 }
      ]
    );

    expect(snapshot.pendingOrderCount).toBe(3);
    expect(snapshot.unreadMerchantMessageCount).toBe(3);
  });

  it('detects when fresh orders or messages arrive after the initial snapshot', () => {
    const previous = {
      pendingOrderCount: 1,
      unreadMerchantMessageCount: 0
    };
    const next = {
      pendingOrderCount: 2,
      unreadMerchantMessageCount: 1
    };

    expect(detectAdminAttentionIncrease(null, next)).toEqual({
      hasNewOrders: false,
      hasNewMerchantMessages: false,
      shouldPlaySound: false
    });

    expect(detectAdminAttentionIncrease(previous, next)).toEqual({
      hasNewOrders: true,
      hasNewMerchantMessages: true,
      shouldPlaySound: true
    });
  });
});
