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
  categoryId: string;
  categoryName?: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  price: number;
  memberPrice: number;
  stock: number;
  sales: number;
  todaySold: number;
  tags: string[];
}

export interface AdminOrder {
  id: string;
  orderNo: string;
  status: string;
  fulfillmentMode: string;
  payableAmount: number;
  totalAmount: number;
  customerName: string;
  customerMobile: string;
  address: string;
  createdAt: string;
  itemCount: number;
  itemSummary: string;
}

export interface AdminMember {
  id: string;
  nickname: string;
  mobile: string;
  memberLevel: string;
  balance: number;
  points: number;
  growthValue: number;
  coupons: number;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

export interface FinanceSummary {
  range: 'today' | 'week' | 'month';
  sales: number;
  orders: number;
  refunds: number;
  profit: number;
  totalRecharge: number;
}

export interface FinanceTransaction {
  id: string;
  type: string;
  orderNo: string;
  amount: number;
  method: string;
  createdAt: string;
  time: string;
  detail: string;
}

export interface PlatformFeeSummary {
  wechatFee: number;
  balanceFee: number;
  totalRecharge: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: string;
  read: boolean;
  createdAt: string;
  time: string;
}

export interface CouponItem {
  id: string;
  title: string;
  threshold: number;
  discount: number;
  used: number;
  total: number;
  status: string;
  createdAt: string;
}

export interface FlashSaleItem {
  id: string;
  title: string;
  productId: string;
  productName: string;
  price: number;
  stock: number;
  sold: number;
  status: string;
  createdAt: string;
}

export interface GroupBuyItem {
  id: string;
  title: string;
  productId: string;
  productName: string;
  price: number;
  groupSize: number;
  completed: number;
  status: string;
  createdAt: string;
}

export interface CheckinRuleItem {
  day: number;
  reward: string;
  desc: string;
}

export interface CreateProductInput {
  categoryId: string;
  name: string;
  subtitle?: string;
  description?: string;
  image?: string;
  price: number;
  memberPrice: number;
  stock: number;
  tags: string[];
}

export interface AuthUser {
  id: string;
  role: 'user' | 'admin';
  nickname: string;
  mobile: string | null;
  memberLevel: string | null;
}

export interface AuthPayload {
  token: string;
  user: AuthUser;
}

export type SmsScene = 'register' | 'reset_password';

export interface SmsCodePayload {
  mobile: string;
  scene: SmsScene;
  expiresInSeconds: number;
  provider: 'mock' | 'tencent';
  debugCode?: string;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000';

function getToken(): string {
  try {
    return localStorage.getItem('smart-member-token') || '';
  } catch {
    return '';
  }
}

async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const raw = await response.text();
  const parsed = raw ? (JSON.parse(raw) as ApiResponse<T>) : null;

  if (!response.ok) {
    throw new Error(parsed?.message || `HTTP ${response.status}`);
  }

  if (!parsed) {
    throw new Error('Empty API response');
  }

  return parsed;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init?.headers as Record<string, string>) || {})
  };

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers
  });

  const body = await parseApiResponse<T>(response);
  return body.data;
}

async function fetchJsonOrFallback<T>(path: string, fallback: T): Promise<T> {
  try {
    return await fetchJson<T>(path);
  } catch {
    return fallback;
  }
}

const fallbackSummary: DashboardSummary = {
  todaySales: 208.8,
  monthlySales: 208.8,
  orders: 2,
  members: 1,
  repurchaseRate: 100,
  rechargeAmount: 0
};

export const apiClient = {
  getDashboardSummary() {
    return fetchJsonOrFallback('/admin/dashboard/summary', fallbackSummary);
  },

  getProducts() {
    return fetchJson<AdminProduct[]>('/admin/products');
  },

  createProduct(payload: CreateProductInput) {
    return fetchJson<AdminProduct>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  updateProductStock(productId: string, delta: number) {
    return fetchJson<AdminProduct>(`/admin/products/${productId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ delta })
    });
  },

  getOrders() {
    return fetchJson<AdminOrder[]>('/admin/orders');
  },

  getMembers() {
    return fetchJson<AdminMember[]>('/admin/users');
  },

  updateMember(
    memberId: string,
    payload: {
      memberLevel?: string;
      balanceDelta?: number;
      pointsDelta?: number;
      growthDelta?: number;
      couponsDelta?: number;
    }
  ) {
    return fetchJson<AdminMember>(`/admin/users/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  getFinanceSummary(range: 'today' | 'week' | 'month' = 'today') {
    return fetchJson<FinanceSummary>(`/admin/finance/summary?range=${range}`);
  },

  getFinanceTransactions(range?: 'today' | 'week' | 'month') {
    const suffix = range ? `?range=${range}` : '';
    return fetchJson<FinanceTransaction[]>(`/admin/finance/transactions${suffix}`);
  },

  getPlatformFees() {
    return fetchJson<PlatformFeeSummary>('/admin/finance/platform-fees');
  },

  getNotifications() {
    return fetchJson<NotificationItem[]>('/admin/notifications');
  },

  getCoupons() {
    return fetchJson<CouponItem[]>('/admin/marketing/coupons');
  },

  createCoupon(payload: {
    title: string;
    threshold: number;
    discount: number;
    total: number;
  }) {
    return fetchJson<CouponItem>('/admin/marketing/coupons', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getFlashSales() {
    return fetchJson<FlashSaleItem[]>('/admin/marketing/flash-sales');
  },

  createFlashSale(payload: {
    title: string;
    productId: string;
    price: number;
    stock: number;
  }) {
    return fetchJson<FlashSaleItem>('/admin/marketing/flash-sales', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getGroupBuys() {
    return fetchJson<GroupBuyItem[]>('/admin/marketing/group-buys');
  },

  createGroupBuy(payload: {
    title: string;
    productId: string;
    price: number;
    groupSize: number;
  }) {
    return fetchJson<GroupBuyItem>('/admin/marketing/group-buys', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getCheckinRules() {
    return fetchJson<CheckinRuleItem[]>('/admin/marketing/checkin-rules');
  },

  updateCheckinRules(rules: CheckinRuleItem[]) {
    return fetchJson<CheckinRuleItem[]>('/admin/marketing/checkin-rules', {
      method: 'PATCH',
      body: JSON.stringify({ rules })
    });
  }
};

export const authClient = {
  async login(role: 'admin' | 'user', account: string, password: string): Promise<AuthPayload> {
    return fetchJson<AuthPayload>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role, account, password })
    });
  },

  async register(
    mobile: string,
    nickname: string,
    password: string,
    confirmPassword: string,
    smsCode: string
  ): Promise<AuthPayload> {
    return fetchJson<AuthPayload>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ mobile, nickname, password, confirmPassword, smsCode })
    });
  },

  async resetPassword(
    mobile: string,
    password: string,
    confirmPassword: string,
    smsCode: string
  ): Promise<{ mobile: string; nickname: string }> {
    return fetchJson<{ mobile: string; nickname: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ mobile, password, confirmPassword, smsCode })
    });
  },

  async sendSmsCode(mobile: string, scene: SmsScene): Promise<SmsCodePayload> {
    return fetchJson<SmsCodePayload>('/auth/send-sms-code', {
      method: 'POST',
      body: JSON.stringify({ mobile, scene })
    });
  }
};
