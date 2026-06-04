import { FulfillmentMode, HomeSectionType, OrderStatus } from './enums';
import type { DemoCategory, DemoHomeSection, DemoOrder, DemoProduct } from './types';

export const demoCategories: DemoCategory[] = [
  { id: 'food', name: '食品生鲜', icon: 'basket' },
  { id: 'beauty', name: '美妆护肤', icon: 'sparkles' },
  { id: 'digital', name: '数码家电', icon: 'tv' },
  { id: 'baby', name: '母婴用品', icon: 'baby' },
  { id: 'sports', name: '运动户外', icon: 'dumbbell' },
  { id: 'health', name: '健康保健', icon: 'heart-pulse' },
  { id: 'home', name: '家居百货', icon: 'sofa' },
  { id: 'member', name: '会员专区', icon: 'crown' }
];

export const demoProducts: DemoProduct[] = [
  {
    id: 'p-001',
    categoryId: 'food',
    name: '甄选阳光蜜桃礼盒',
    subtitle: '会员超市爆款水果组合',
    price: 59.9,
    memberPrice: 49.9,
    marketPrice: 69.9,
    stock: 180,
    sales: 1260,
    image: 'https://images.unsplash.com/photo-1471943311424-646960669fbc?auto=format&fit=crop&w=800&q=80',
    tags: ['爆款', '会员价'],
    isFeatured: true
  },
  {
    id: 'p-002',
    categoryId: 'home',
    name: '家庭装洗衣凝珠',
    subtitle: '清香持久，囤货首选',
    price: 39.9,
    memberPrice: 32.9,
    marketPrice: 45.9,
    stock: 240,
    sales: 876,
    image: 'https://images.unsplash.com/photo-1583947582886-f40ec95dd752?auto=format&fit=crop&w=800&q=80',
    tags: ['限时折扣'],
    isFeatured: false
  },
  {
    id: 'p-003',
    categoryId: 'health',
    name: '每日益生菌礼装',
    subtitle: '健康专区复购款',
    price: 129,
    memberPrice: 109,
    marketPrice: 149,
    stock: 96,
    sales: 432,
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80',
    tags: ['会员专享'],
    isFeatured: true
  }
];

export const demoHomeSections: DemoHomeSection[] = [
  {
    id: 'hs-001',
    type: HomeSectionType.FlashSale,
    title: '限时秒杀',
    productIds: ['p-001', 'p-002']
  },
  {
    id: 'hs-002',
    type: HomeSectionType.GroupBuying,
    title: '拼团活动',
    productIds: ['p-001', 'p-003']
  },
  {
    id: 'hs-003',
    type: HomeSectionType.MemberExclusive,
    title: '会员专享',
    productIds: ['p-003']
  }
];

export const demoOrders: DemoOrder[] = [
  {
    id: 'o-001',
    orderNo: 'SM202606040001',
    status: OrderStatus.PendingPayment,
    fulfillmentMode: FulfillmentMode.Delivery,
    totalAmount: 109.8,
    productIds: ['p-001', 'p-002']
  },
  {
    id: 'o-002',
    orderNo: 'SM202606040002',
    status: OrderStatus.PendingPickup,
    fulfillmentMode: FulfillmentMode.Pickup,
    totalAmount: 109,
    productIds: ['p-003']
  }
];
