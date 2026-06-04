export const categories = [
  { id: 'food', name: '食品生鲜', icon: 'basket' },
  { id: 'beauty', name: '美妆护肤', icon: 'sparkles' },
  { id: 'digital', name: '数码家电', icon: 'monitor' },
  { id: 'baby', name: '母婴用品', icon: 'baby' },
  { id: 'sports', name: '运动户外', icon: 'dumbbell' },
  { id: 'health', name: '健康保健', icon: 'heart' },
  { id: 'home', name: '家居百货', icon: 'sofa' },
  { id: 'member', name: '会员专区', icon: 'crown' }
];

export const banners = [
  {
    id: 'b-001',
    title: '社区团购精选会场',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'b-002',
    title: '会员专享爆款直降',
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?auto=format&fit=crop&w=1200&q=80'
  }
];

export const products = [
  {
    id: 'p-001',
    categoryId: 'food',
    name: '甄选阳光蜜桃礼盒',
    subtitle: '社区团购爆款水果组合',
    price: 59.9,
    memberPrice: 49.9,
    stock: 180,
    sales: 1260,
    image: banners[0].image,
    tags: ['爆款', '会员价']
  },
  {
    id: 'p-002',
    categoryId: 'home',
    name: '家庭装洗衣凝珠',
    subtitle: '清香持久，家庭囤货款',
    price: 39.9,
    memberPrice: 32.9,
    stock: 240,
    sales: 876,
    image: banners[1].image,
    tags: ['秒杀']
  },
  {
    id: 'p-003',
    categoryId: 'health',
    name: '每日益生菌礼装',
    subtitle: '健康专区高复购商品',
    price: 129,
    memberPrice: 109,
    stock: 96,
    sales: 432,
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80',
    tags: ['会员专享']
  }
];

export const homeSections = [
  { id: 'hs-001', type: 'flash_sale', title: '限时秒杀', products: [products[0], products[1]] },
  { id: 'hs-002', type: 'group_buying', title: '拼团专区', products: [products[0], products[2]] },
  { id: 'hs-003', type: 'member_exclusive', title: '会员专享', products: [products[2]] }
];

export const coupons = [
  { id: 'c-001', title: '满99减10', threshold: 99, discount: 10 },
  { id: 'c-002', title: '会员券 20 元', threshold: 199, discount: 20 }
];

export const members = [
  {
    id: 'u-001',
    nickname: '星选会员',
    mobile: '13800000000',
    memberLevel: '黄金会员',
    balance: 120,
    points: 580,
    growthValue: 960,
    coupons: 4
  }
];

export const orders = [
  {
    id: 'o-001',
    orderNo: 'SM202606040001',
    status: 'pending_payment',
    fulfillmentMode: 'delivery',
    totalAmount: 109.8,
    payableAmount: 99.8,
    productIds: ['p-001', 'p-002']
  },
  {
    id: 'o-002',
    orderNo: 'SM202606040002',
    status: 'pending_pickup',
    fulfillmentMode: 'pickup',
    totalAmount: 109,
    payableAmount: 109,
    productIds: ['p-003']
  }
];
