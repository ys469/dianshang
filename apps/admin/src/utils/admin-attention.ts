import type { AdminOrder, MerchantThreadItem } from '../services/api';

export interface AdminAttentionSnapshot {
  pendingOrderCount: number;
  unreadMerchantMessageCount: number;
}

export interface AdminAttentionIncrease {
  hasNewOrders: boolean;
  hasNewMerchantMessages: boolean;
  shouldPlaySound: boolean;
}

const ATTENTION_ORDER_STATUSES = new Set(['待发货', '待收货', '待提货']);

export function buildAdminAttentionSnapshot(
  orders: Array<Pick<AdminOrder, 'status'>>,
  merchantThreads: Array<Pick<MerchantThreadItem, 'adminUnreadCount'>>
): AdminAttentionSnapshot {
  return {
    pendingOrderCount: orders.filter((order) => ATTENTION_ORDER_STATUSES.has(order.status)).length,
    unreadMerchantMessageCount: merchantThreads.reduce(
      (sum, thread) => sum + Math.max(0, thread.adminUnreadCount),
      0
    )
  };
}

export function detectAdminAttentionIncrease(
  previous: AdminAttentionSnapshot | null,
  next: AdminAttentionSnapshot
): AdminAttentionIncrease {
  if (!previous) {
    return {
      hasNewOrders: false,
      hasNewMerchantMessages: false,
      shouldPlaySound: false
    };
  }

  const hasNewOrders = next.pendingOrderCount > previous.pendingOrderCount;
  const hasNewMerchantMessages =
    next.unreadMerchantMessageCount > previous.unreadMerchantMessageCount;

  return {
    hasNewOrders,
    hasNewMerchantMessages,
    shouldPlaySound: hasNewOrders || hasNewMerchantMessages
  };
}
