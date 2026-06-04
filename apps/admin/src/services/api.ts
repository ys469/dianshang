export interface DashboardSummary {
  todaySales: number;
  monthlySales: number;
  orders: number;
  members: number;
  repurchaseRate: number;
  rechargeAmount: number;
}

export interface AdminProduct {
  id: string;
  name: string;
  price: number;
  memberPrice: number;
  stock: number;
  sales: number;
  tags: string[];
}

export interface AdminOrder {
  orderNo: string;
  status: string;
  fulfillmentMode: string;
  payableAmount: number;
}

export interface AdminMember {
  nickname: string;
  mobile: string;
  memberLevel: string;
  points: number;
  coupons: number;
}

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000';

const fallbackSummary: DashboardSummary = {
  todaySales: 18680,
  monthlySales: 298600,
  orders: 326,
  members: 2180,
  repurchaseRate: 38.6,
  rechargeAmount: 68000
};

const fallbackProducts: AdminProduct[] = [
  {
    id: 'p-001',
    name: '甄选阳光蜜桃礼盒',
    price: 59.9,
    memberPrice: 49.9,
    stock: 180,
    sales: 1260,
    tags: ['爆款', '会员价']
  },
  {
    id: 'p-002',
    name: '家庭装洗衣凝珠',
    price: 39.9,
    memberPrice: 32.9,
    stock: 240,
    sales: 876,
    tags: ['秒杀']
  }
];

const fallbackOrders: AdminOrder[] = [
  { orderNo: 'SM202606040001', status: '待付款', fulfillmentMode: '快递到家', payableAmount: 99.8 },
  { orderNo: 'SM202606040002', status: '待提货', fulfillmentMode: '门店自提', payableAmount: 109 }
];

const fallbackMembers: AdminMember[] = [
  { nickname: '星选会员', mobile: '13800000000', memberLevel: '黄金会员', points: 580, coupons: 4 }
];

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${apiBase}${path}`);
    if (!response.ok) {
      return fallback;
    }
    const body = await response.json();
    return body.data as T;
  } catch {
    return fallback;
  }
}

export const apiClient = {
  getDashboardSummary() {
    return fetchJson('/admin/dashboard/summary', fallbackSummary);
  },
  getProducts() {
    return fetchJson('/admin/products', fallbackProducts);
  },
  getOrders() {
    return fetchJson('/admin/orders', fallbackOrders);
  },
  getMembers() {
    return fetchJson('/admin/users', fallbackMembers);
  }
};
