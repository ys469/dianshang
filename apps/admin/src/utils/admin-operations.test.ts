import { describe, expect, it } from 'vitest';
import type { AdminOrder, AdminProduct } from '../services/api';
import {
  canCompleteOrder,
  canShipOrder,
  filterOrders,
  filterProducts,
  getShippingDraftHint,
  isShippingDraftReady,
  getOrderActionLabel
} from './admin-operations';

const sampleProducts: AdminProduct[] = [
  {
    id: 'p-1',
    categoryId: 'food',
    categoryName: '食品生鲜',
    name: '进口蓝莓',
    subtitle: '当日直送',
    description: '新鲜蓝莓礼盒',
    image: 'https://example.com/berry.jpg',
    price: 39.9,
    memberPrice: 34.9,
    stock: 66,
    sales: 40,
    todaySold: 8,
    tags: ['新品', '水果'],
    listed: true,
    updatedAt: '2026-06-07T00:00:00.000Z'
  },
  {
    id: 'p-2',
    categoryId: 'beauty',
    categoryName: '美妆护肤',
    name: '精华面膜',
    subtitle: '补水修护',
    description: '适合夜间护理',
    image: 'https://example.com/mask.jpg',
    price: 99,
    memberPrice: 79,
    stock: 12,
    sales: 15,
    todaySold: 1,
    tags: ['会员专享'],
    listed: false,
    updatedAt: '2026-06-07T00:00:00.000Z'
  }
];

const sampleOrders: AdminOrder[] = [
  {
    id: 'o-1',
    orderNo: 'SO20260607001',
    status: '待发货',
    paymentMethod: 'wechat',
    paymentState: 'success',
    paymentChannel: 'native',
    transactionId: 'wx-001',
    paidAt: '2026-06-07T10:00:00.000Z',
    fulfillmentMode: '快递到家',
    payableAmount: 39.9,
    totalAmount: 39.9,
    customerName: '张三',
    customerMobile: '13800000001',
    address: '上海市浦东新区锦绣路 100 号',
    createdAt: '2026-06-07T09:58:00.000Z',
    cancelDeadlineAt: '2026-06-07T10:01:00.000Z',
    cancelledAt: null,
    canCancel: false,
    logisticsCompany: null,
    trackingNo: null,
    shippedAt: null,
    completedAt: null,
    itemCount: 1,
    itemSummary: '进口蓝莓 x1',
    items: [
      {
        productId: 'p-1',
        productName: '进口蓝莓',
        quantity: 1,
        price: 39.9,
        memberPrice: 34.9
      }
    ]
  },
  {
    id: 'o-2',
    orderNo: 'SO20260607002',
    status: '待提货',
    paymentMethod: 'balance',
    paymentState: 'success',
    paymentChannel: 'balance',
    transactionId: 'bal-001',
    paidAt: '2026-06-07T10:30:00.000Z',
    fulfillmentMode: '门店自提',
    payableAmount: 79,
    totalAmount: 79,
    customerName: '李四',
    customerMobile: '13800000002',
    address: '上海市徐汇区虹桥路 20 号',
    createdAt: '2026-06-07T10:20:00.000Z',
    cancelDeadlineAt: '2026-06-07T10:23:00.000Z',
    cancelledAt: null,
    canCancel: false,
    logisticsCompany: null,
    trackingNo: null,
    shippedAt: null,
    completedAt: null,
    itemCount: 2,
    itemSummary: '精华面膜 x2',
    items: [
      {
        productId: 'p-2',
        productName: '精华面膜',
        quantity: 2,
        price: 99,
        memberPrice: 79
      }
    ]
  }
];

describe('admin operations helpers', () => {
  it('filters products by keyword and stock status', () => {
    expect(filterProducts(sampleProducts, '蓝莓', 'all')).toHaveLength(1);
    expect(filterProducts(sampleProducts, '', 'listed')).toEqual([sampleProducts[0]]);
    expect(filterProducts(sampleProducts, '', 'unlisted')).toEqual([sampleProducts[1]]);
    expect(filterProducts(sampleProducts, '', 'low_stock')).toEqual([sampleProducts[1]]);
  });

  it('filters orders by keyword and admin bucket', () => {
    expect(filterOrders(sampleOrders, '13800000002', 'all')).toEqual([sampleOrders[1]]);
    expect(filterOrders(sampleOrders, '', 'pending')).toEqual([sampleOrders[0]]);
    expect(filterOrders(sampleOrders, '', 'pickup')).toEqual([sampleOrders[1]]);
  });

  it('derives order action availability from actual order state', () => {
    expect(canShipOrder(sampleOrders[0])).toBe(true);
    expect(canShipOrder(sampleOrders[1])).toBe(false);
    expect(canCompleteOrder(sampleOrders[0])).toBe(false);
    expect(canCompleteOrder(sampleOrders[1])).toBe(true);
    expect(getOrderActionLabel(sampleOrders[0])).toBe('发货');
    expect(getOrderActionLabel(sampleOrders[1])).toBe('完成订单');
  });

  it('requires complete logistics details before shipping can be submitted', () => {
    expect(
      isShippingDraftReady({
        logisticsCompany: '',
        trackingNo: ''
      })
    ).toBe(false);
    expect(
      isShippingDraftReady({
        logisticsCompany: '顺丰速运',
        trackingNo: ''
      })
    ).toBe(false);
    expect(
      isShippingDraftReady({
        logisticsCompany: ' ',
        trackingNo: 'SF1234567890'
      })
    ).toBe(false);
    expect(
      isShippingDraftReady({
        logisticsCompany: '顺丰速运',
        trackingNo: 'SF1234567890'
      })
    ).toBe(true);
  });

  it('provides a clear shipping helper hint for incomplete drafts', () => {
    expect(
      getShippingDraftHint({
        logisticsCompany: '',
        trackingNo: ''
      })
    ).toBe('请先填写物流公司和运单号');
    expect(
      getShippingDraftHint({
        logisticsCompany: '顺丰速运',
        trackingNo: ''
      })
    ).toBe('还差运单号');
    expect(
      getShippingDraftHint({
        logisticsCompany: '',
        trackingNo: 'SF1234567890'
      })
    ).toBe('还差物流公司');
    expect(
      getShippingDraftHint({
        logisticsCompany: '顺丰速运',
        trackingNo: 'SF1234567890'
      })
    ).toBe('物流信息已填写完整，可以确认发货');
  });
});
