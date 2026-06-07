import { getClientStorageItem } from './client-storage';

export interface HomePayload {
  banners: Array<{ id: string; title: string; image: string }>;
  categories: Array<{ id: string; name: string }>;
  notice: string;
  coupons?: Array<{
    id: string;
    title: string;
    threshold: number;
    discount: number;
    used?: number;
    total?: number;
    status?: string;
  }>;
  sections: Array<{
    id: string;
    type: string;
    title: string;
    products: Array<{
      id: string;
      name: string;
      price: number;
      memberPrice: number;
      image: string;
      tags: string[];
    }>;
  }>;
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

export type SmsScene = 'register' | 'reset_password' | 'login';

export interface SmsCodePayload {
  mobile: string;
  scene: SmsScene;
  expiresInSeconds: number;
  provider: 'mock' | 'tencent';
  debugCode?: string;
}

export interface OrderPayload {
  id: string;
  orderNo: string;
  status: string;
  paymentMethod: 'balance' | 'wechat';
  paymentState: 'pending' | 'success' | 'failed' | 'closed';
  paymentChannel: 'balance' | 'native' | 'h5' | null;
  transactionId: string | null;
  paidAt: string | null;
  fulfillmentMode: string;
  payableAmount: number;
  totalAmount: number;
  customerName: string;
  customerMobile: string;
  address: string;
  createdAt: string;
  cancelDeadlineAt: string;
  cancelledAt: string | null;
  canCancel: boolean;
  itemCount: number;
  itemSummary: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    memberPrice: number;
  }>;
}

export interface MemberProfile {
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
  defaultConsignee: string;
  contactMobile: string;
  defaultAddress: string;
  lastCheckInAt: string | null;
  checkinStreak: number;
}

export interface RechargePayload {
  id: string;
  rechargeNo: string;
  amount: number;
  bonusAmount: number;
  actualAmount: number;
  balanceAfter: number;
  paymentMethod: 'balance' | 'wechat';
  paymentState: 'pending' | 'success' | 'failed' | 'closed';
  paymentChannel: 'balance' | 'native' | 'h5' | null;
  transactionId: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface WechatRechargeSessionPayload {
  rechargeNo: string;
  amount: number;
  bonusAmount: number;
  actualAmount: number;
  channel: 'native' | 'h5';
  h5Url: string | null;
  codeUrl: string | null;
  paymentState: 'pending' | 'success' | 'failed' | 'closed';
}

export interface CheckInPayload {
  rewardPoints: number;
  rewardCoupons: number;
  rewardLabel: string;
  streak: number;
  profile: MemberProfile;
}

export interface SupportChatPayload {
  reply: string;
  handoffSuggested: boolean;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000';

function getToken(): string {
  return getClientStorageItem('smart-member-mobile-token');
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

const fallbackHome: HomePayload = {
  banners: [
    {
      id: 'b-001',
      title: '社区团购精选会场',
      image:
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'b-002',
      title: '会员专享爆款直降',
      image:
        'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?auto=format&fit=crop&w=1200&q=80'
    }
  ],
  categories: [
    { id: 'food', name: '食品生鲜' },
    { id: 'beauty', name: '美妆护肤' },
    { id: 'digital', name: '数码家电' },
    { id: 'baby', name: '母婴用品' },
    { id: 'sports', name: '运动户外' },
    { id: 'health', name: '健康保健' },
    { id: 'home', name: '家居百货' },
    { id: 'member', name: '会员专区' }
  ],
  notice: '新用户专享券和今日秒杀活动已开放。',
  sections: [
    {
      id: 'hs-001',
      type: 'flash_sale',
      title: '限时秒杀',
      products: [
        {
          id: 'p-001',
          name: '甄选阳光蜜桃礼盒',
          price: 59.9,
          memberPrice: 49.9,
          image:
            'https://images.unsplash.com/photo-1471943311424-646960669fbc?auto=format&fit=crop&w=800&q=80',
          tags: ['爆款', '会员价']
        },
        {
          id: 'p-002',
          name: '家庭装洗衣凝珠',
          price: 39.9,
          memberPrice: 32.9,
          image:
            'https://images.unsplash.com/photo-1583947582886-f40ec95dd752?auto=format&fit=crop&w=800&q=80',
          tags: ['秒杀']
        }
      ]
    },
    {
      id: 'hs-002',
      type: 'member_exclusive',
      title: '会员专享',
      products: [
        {
          id: 'p-003',
          name: '每日益生菌礼盒',
          price: 129,
          memberPrice: 109,
          image:
            'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80',
          tags: ['会员专享']
        }
      ]
    }
  ]
};

export const apiClient = {
  getHome() {
    return fetchJson<HomePayload>('/home', { method: 'GET' }).catch(() => fallbackHome);
  }
};

export const authClient = {
  async login(role: 'admin' | 'user', account: string, password: string): Promise<AuthPayload> {
    return fetchJson<AuthPayload>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role, account, password })
    });
  },

  async smsLogin(mobile: string, smsCode: string): Promise<AuthPayload> {
    return fetchJson<AuthPayload>('/auth/sms-login', {
      method: 'POST',
      body: JSON.stringify({ mobile, smsCode })
    });
  },

  async register(
    mobile: string,
    nickname: string,
    password: string,
    confirmPassword: string,
    smsCode?: string
  ): Promise<AuthPayload> {
    const payload: {
      mobile: string;
      nickname: string;
      password: string;
      confirmPassword: string;
      smsCode?: string;
    } = { mobile, nickname, password, confirmPassword };

    if (smsCode?.trim()) {
      payload.smsCode = smsCode.trim();
    }

    return fetchJson<AuthPayload>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
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

export const ordersClient = {
  async create(payload: {
    fulfillmentMode: 'delivery' | 'pickup';
    paymentMethod?: 'balance' | 'wechat';
    consignee: string;
    mobile: string;
    address: string;
    items: Array<{ productId: string; quantity: number }>;
  }) {
    return fetchJson<OrderPayload>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async list() {
    return fetchJson<OrderPayload[]>('/orders', {
      method: 'GET'
    });
  },

  async cancel(orderNo: string) {
    return fetchJson<OrderPayload>(`/orders/${orderNo}/cancel`, {
      method: 'POST'
    });
  }
};

export const memberClient = {
  async getProfile() {
    return fetchJson<MemberProfile>('/member/profile', {
      method: 'GET'
    });
  },

  async updateProfile(payload: {
    defaultConsignee: string;
    contactMobile: string;
    defaultAddress: string;
  }) {
    return fetchJson<MemberProfile>('/member/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async getOrders() {
    return fetchJson<OrderPayload[]>('/member/orders', {
      method: 'GET'
    });
  },

  async claimDailyCheckIn() {
    return fetchJson<CheckInPayload>('/member/check-in', {
      method: 'POST'
    });
  },

  async sendSupportMessage(payload: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }) {
    return fetchJson<SupportChatPayload>('/member/support-chat', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async recharge(amount: number) {
    return fetchJson<RechargePayload>('/member/recharge', {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
  }
};

export const paymentsClient = {
  async createRechargeSession(payload: {
    amount: number;
    channel: 'native' | 'h5';
    payerClientIp?: string;
  }) {
    return fetchJson<WechatRechargeSessionPayload>('/payments/wechat/recharge-session', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getRechargeStatus(rechargeNo: string) {
    return fetchJson<RechargePayload>(`/payments/wechat/recharges/${rechargeNo}`, {
      method: 'GET'
    });
  }
};
