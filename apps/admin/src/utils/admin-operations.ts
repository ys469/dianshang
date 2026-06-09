import type { AdminOrder, AdminProduct } from '../services/api';

export type ProductStatusFilter = 'all' | 'listed' | 'unlisted' | 'low_stock';
export type OrderStatusFilter = 'all' | 'pending' | 'pickup' | 'done';
export type ShippingDraft = {
  logisticsCompany: string;
  trackingNo: string;
};

export function filterProducts(
  products: AdminProduct[],
  keyword: string,
  statusFilter: ProductStatusFilter
) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  return products.filter((product) => {
    const matchesKeyword =
      !normalizedKeyword ||
      [
        product.name,
        product.subtitle,
        product.description,
        product.categoryName || product.categoryId,
        product.tags.join(' ')
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedKeyword);

    if (!matchesKeyword) {
      return false;
    }

    if (statusFilter === 'listed') {
      return product.listed;
    }

    if (statusFilter === 'unlisted') {
      return !product.listed;
    }

    if (statusFilter === 'low_stock') {
      return product.stock > 0 && product.stock < 50;
    }

    return true;
  });
}

export function filterOrders(
  orders: AdminOrder[],
  keyword: string,
  statusFilter: OrderStatusFilter
) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  const searched = normalizedKeyword
    ? orders.filter((order) =>
        [
          order.orderNo,
          order.customerName,
          order.customerMobile,
          order.address,
          order.itemSummary
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword)
      )
    : orders;

  if (statusFilter === 'pending') {
    return searched.filter((order) => ['待付款', '待发货', '待收货'].includes(order.status));
  }

  if (statusFilter === 'pickup') {
    return searched.filter((order) => order.status.includes('提货'));
  }

  if (statusFilter === 'done') {
    return searched.filter((order) => order.status.includes('完成'));
  }

  return searched;
}

export function canShipOrder(order: AdminOrder) {
  return (
    order.paymentState === 'success' &&
    order.fulfillmentMode === '快递到家' &&
    order.status === '待发货'
  );
}

export function canCompleteOrder(order: AdminOrder) {
  if (order.paymentState !== 'success') {
    return false;
  }

  if (order.fulfillmentMode === '门店自提') {
    return ['待提货', '待发货'].includes(order.status);
  }

  return order.status === '待收货';
}

export function canCancelOrderByAdmin(order: AdminOrder) {
  return order.canCancel && order.status !== '已取消';
}

export function getOrderActionLabel(order: AdminOrder) {
  if (canShipOrder(order)) {
    return '发货';
  }

  if (canCompleteOrder(order)) {
    return '完成订单';
  }

  return '查看订单';
}

export function isShippingDraftReady(draft: ShippingDraft) {
  return Boolean(draft.logisticsCompany.trim() && draft.trackingNo.trim());
}

export function getShippingDraftHint(draft: ShippingDraft) {
  const hasLogisticsCompany = Boolean(draft.logisticsCompany.trim());
  const hasTrackingNo = Boolean(draft.trackingNo.trim());

  if (hasLogisticsCompany && hasTrackingNo) {
    return '物流信息已填写完整，可以确认发货';
  }

  if (!hasLogisticsCompany && !hasTrackingNo) {
    return '请先填写物流公司和运单号';
  }

  if (!hasLogisticsCompany) {
    return '还差物流公司';
  }

  return '还差运单号';
}
