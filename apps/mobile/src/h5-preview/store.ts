import { defineStore } from 'pinia';
import {
  authClient,
  memberClient,
  ordersClient,
  type HomePayload,
  type MemberProfile,
  type OrderPayload
} from '../services/api';

export type DemoProduct = HomePayload['sections'][number]['products'][number];

export interface CatalogProduct extends DemoProduct {
  categoryId?: string | null;
  sectionId?: string;
  sectionTitle?: string;
}

export interface CartItem extends CatalogProduct {
  quantity: number;
}

export interface DemoOrder {
  id: string;
  createdAt: string;
  itemCount: number;
  total: number;
  status: '待发货' | '已完成';
  items: CartItem[];
}

export type ActivePanel =
  | 'product'
  | 'orders'
  | 'address'
  | 'wallet'
  | 'points'
  | 'support'
  | null;

export type ProfileAction =
  | 'orders'
  | 'address'
  | 'recharge'
  | 'points'
  | 'checkin'
  | 'support';

export type LoginRole = 'user' | 'admin';

export type AdminShortcutKey =
  | 'products'
  | 'members'
  | 'orders'
  | 'marketing'
  | 'finance'
  | 'notifications';

export interface AdminShortcutDefinition {
  key: AdminShortcutKey;
  label: string;
  description: string;
}

export interface LoginPayload {
  role: LoginRole;
  account: string;
  password: string;
}

export interface RegisterPayload {
  mobile: string;
  nickname: string;
  password: string;
  confirmPassword: string;
  smsCode: string;
}

export interface ResetPasswordPayload {
  mobile: string;
  password: string;
  confirmPassword: string;
  smsCode: string;
}

export const adminShortcutDefinitions: AdminShortcutDefinition[] = [
  { key: 'products', label: '商品管理', description: '管理商品、库存与会员价' },
  { key: 'members', label: '会员管理', description: '查看会员等级、积分和成长值' },
  { key: 'orders', label: '订单管理', description: '跟进待发货、待提货和售后订单' },
  { key: 'marketing', label: '营销活动', description: '配置拼团、秒杀与优惠券' },
  { key: 'finance', label: '财务对账', description: '核对销售额、充值与资金流水' },
  { key: 'notifications', label: '消息通知', description: '查看订单、发货和系统通知' }
];

const INITIAL_WALLET_BALANCE = 520;
const INITIAL_POINTS = 580;
const TOKEN_KEY = 'smart-member-mobile-token';
const USER_KEY = 'smart-member-mobile-user';

const demoAccounts: Record<LoginRole, { account: string; password: string; name: string }> = {
  user: {
    account: '13800138000',
    password: 'member123',
    name: '星选会员'
  },
  admin: {
    account: 'admin',
    password: 'admin123',
    name: '运营管理员'
  }
};

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export function filterProducts<T extends { name: string; tags: string[]; categoryId?: string | null }>(
  products: T[],
  query: string,
  categoryId: string | null = null
) {
  const normalizedQuery = normalizeSearchValue(query);

  return products.filter((product) => {
    const matchesCategory = !categoryId || product.categoryId === categoryId;
    if (!matchesCategory) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = normalizeSearchValue(`${product.name} ${product.tags.join(' ')}`);
    return haystack.includes(normalizedQuery);
  });
}

function calculateTotal(items: Array<{ memberPrice: number; quantity: number }>) {
  return Number(
    items.reduce((sum, item) => sum + item.memberPrice * item.quantity, 0).toFixed(2)
  );
}

function createFallbackOrder(items: CartItem[]): DemoOrder {
  const timestamp = Date.now();

  return {
    id: `SO-${timestamp}`,
    createdAt: new Date(timestamp).toLocaleString('zh-CN', { hour12: false }),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: calculateTotal(items),
    status: '待发货',
    items
  };
}

function createResult(success: boolean, message: string) {
  return { success, message };
}

function setStorageItem(key: string, value: string) {
  try {
    uni.setStorageSync(key, value);
  } catch {
    // ignore storage errors in browser preview
  }
}

function removeStorageItem(key: string) {
  try {
    uni.removeStorageSync(key);
  } catch {
    // ignore storage errors in browser preview
  }
}

function mapApiOrderToDemoOrder(order: OrderPayload, items: CartItem[] = []): DemoOrder {
  return {
    id: order.orderNo,
    createdAt: order.createdAt,
    itemCount: order.itemCount,
    total: order.payableAmount,
    status: order.status.includes('完成') ? '已完成' : '待发货',
    items
  };
}

export const useDemoMallStore = defineStore('demo-mall', {
  state: () => ({
    isAuthenticated: false,
    currentRole: 'user' as LoginRole,
    currentUserName: '',
    currentUserMobile: '',
    searchDraft: '',
    searchQuery: '',
    selectedCategoryId: null as string | null,
    cart: [] as CartItem[],
    orders: [] as DemoOrder[],
    walletBalance: INITIAL_WALLET_BALANCE,
    points: INITIAL_POINTS,
    coupons: 4,
    dailyCheckInClaimed: false,
    activePanel: null as ActivePanel,
    activeAdminShortcut: null as AdminShortcutKey | null,
    selectedProduct: null as CatalogProduct | null,
    feedbackMessage: '',
    unreadMessages: 2,
    defaultAddress: '上海市浦东新区张江路 88 号 星选生活馆',
    supportReply: '在线客服通常会在 5 分钟内响应。'
  }),
  getters: {
    cartCount: (state) => state.cart.reduce((sum, item) => sum + item.quantity, 0),
    cartTotal: (state) => calculateTotal(state.cart),
    isAdmin: (state) => state.isAuthenticated && state.currentRole === 'admin',
    isUser: (state) => state.isAuthenticated && state.currentRole === 'user'
  },
  actions: {
    applyMemberProfile(profile: MemberProfile) {
      this.currentUserName = profile.nickname;
      this.currentUserMobile = profile.mobile;
      this.walletBalance = profile.balance;
      this.points = profile.points;
      this.coupons = profile.coupons;
      this.defaultAddress = profile.defaultAddress || this.defaultAddress;
    },

    async syncMemberData() {
      const [profile, orders] = await Promise.all([
        memberClient.getProfile(),
        memberClient.getOrders().catch(() => [])
      ]);

      this.applyMemberProfile(profile);
      this.orders = orders.map((order) => mapApiOrderToDemoOrder(order));
    },

    async login(payload: LoginPayload) {
      try {
        const result = await authClient.login(payload.role, payload.account, payload.password);
        this.isAuthenticated = true;
        this.currentRole = payload.role;
        this.currentUserName = result.user.nickname;
        this.currentUserMobile = result.user.mobile ?? payload.account;
        this.activeAdminShortcut = payload.role === 'admin' ? 'products' : null;
        setStorageItem(TOKEN_KEY, result.token);
        setStorageItem(USER_KEY, JSON.stringify(result.user));

        if (payload.role === 'user') {
          await this.syncMemberData().catch(() => undefined);
        }

        this.feedbackMessage =
          payload.role === 'admin'
            ? '管理员登录成功，已进入运营后台'
            : '会员登录成功，欢迎回来';
        return createResult(true, this.feedbackMessage);
      } catch (error) {
        const account = demoAccounts[payload.role];
        if (payload.account !== account.account || payload.password !== account.password) {
          this.feedbackMessage =
            error instanceof Error
              ? error.message
              : payload.role === 'admin'
                ? '管理员账号或密码错误'
                : '手机号或密码错误';
          return createResult(false, this.feedbackMessage);
        }

        this.isAuthenticated = true;
        this.currentRole = payload.role;
        this.currentUserName = account.name;
        this.currentUserMobile = payload.role === 'user' ? payload.account : '';
        this.activeAdminShortcut = payload.role === 'admin' ? 'products' : null;
        removeStorageItem(TOKEN_KEY);
        removeStorageItem(USER_KEY);
        this.feedbackMessage =
          payload.role === 'admin'
            ? '管理员登录成功，已进入运营后台'
            : '会员登录成功，欢迎回来';
        return createResult(true, this.feedbackMessage);
      }
    },

    async register(payload: RegisterPayload) {
      try {
        const result = await authClient.register(
          payload.mobile,
          payload.nickname,
          payload.password,
          payload.confirmPassword,
          payload.smsCode
        );

        this.isAuthenticated = true;
        this.currentRole = 'user';
        this.currentUserName = result.user.nickname;
        this.currentUserMobile = result.user.mobile ?? payload.mobile;
        this.activeAdminShortcut = null;
        setStorageItem(TOKEN_KEY, result.token);
        setStorageItem(USER_KEY, JSON.stringify(result.user));
        await this.syncMemberData().catch(() => undefined);
        this.feedbackMessage = '会员注册成功，已自动登录';
        return createResult(true, this.feedbackMessage);
      } catch (error) {
        this.feedbackMessage = error instanceof Error ? error.message : '注册失败';
        return createResult(false, this.feedbackMessage);
      }
    },

    async resetPassword(payload: ResetPasswordPayload) {
      try {
        await authClient.resetPassword(
          payload.mobile,
          payload.password,
          payload.confirmPassword,
          payload.smsCode
        );
        this.feedbackMessage = '密码已重置，请使用新密码登录';
        return createResult(true, this.feedbackMessage);
      } catch (error) {
        this.feedbackMessage = error instanceof Error ? error.message : '重置密码失败';
        return createResult(false, this.feedbackMessage);
      }
    },

    async sendSmsCode(mobile: string, scene: 'register' | 'reset_password') {
      try {
        const result = await authClient.sendSmsCode(mobile, scene);
        this.feedbackMessage = result.debugCode
          ? `验证码已发送，开发验证码：${result.debugCode}`
          : '验证码已发送，请查看短信';
        return {
          success: true,
          message: this.feedbackMessage,
          debugCode: result.debugCode
        };
      } catch (error) {
        this.feedbackMessage = error instanceof Error ? error.message : '验证码发送失败';
        return createResult(false, this.feedbackMessage);
      }
    },

    logout() {
      this.isAuthenticated = false;
      this.currentRole = 'user';
      this.currentUserName = '';
      this.currentUserMobile = '';
      this.cart = [];
      this.orders = [];
      this.walletBalance = INITIAL_WALLET_BALANCE;
      this.points = INITIAL_POINTS;
      this.coupons = 4;
      this.activePanel = null;
      this.activeAdminShortcut = null;
      this.selectedProduct = null;
      removeStorageItem(TOKEN_KEY);
      removeStorageItem(USER_KEY);
      this.feedbackMessage = '已退出当前账号';
      return createResult(true, this.feedbackMessage);
    },

    setSearchDraft(query: string) {
      this.searchDraft = query;
    },

    submitSearch() {
      this.searchQuery = this.searchDraft.trim();
      this.feedbackMessage = this.searchQuery
        ? `已搜索“${this.searchQuery}”`
        : '已清空搜索条件';
      return createResult(true, this.feedbackMessage);
    },

    setCategory(categoryId: string | null) {
      this.selectedCategoryId = this.selectedCategoryId === categoryId ? null : categoryId;
    },

    openProduct(product: CatalogProduct) {
      this.selectedProduct = product;
      this.activePanel = 'product';
    },

    openPanel(panel: ActivePanel) {
      this.activePanel = panel;
    },

    openAdminShortcut(shortcut: AdminShortcutKey) {
      if (!this.isAdmin) {
        this.feedbackMessage = '请先使用管理员账号登录';
        return createResult(false, this.feedbackMessage);
      }

      const target = adminShortcutDefinitions.find((item) => item.key === shortcut);
      this.activeAdminShortcut = shortcut;
      this.feedbackMessage = target ? `已切换到${target.label}` : '已切换后台模块';
      return createResult(true, this.feedbackMessage);
    },

    closePanel() {
      this.activePanel = null;
      this.selectedProduct = null;
    },

    setFeedback(message: string) {
      this.feedbackMessage = message;
    },

    clearFeedback() {
      this.feedbackMessage = '';
    },

    addToCart(product: CatalogProduct) {
      const existing = this.cart.find((item) => item.id === product.id);

      if (existing) {
        existing.quantity += 1;
      } else {
        this.cart.push({ ...product, quantity: 1 });
      }

      this.feedbackMessage = `${product.name} 已加入购物车`;
      return createResult(true, this.feedbackMessage);
    },

    updateCartQuantity(productId: string, delta: number) {
      const target = this.cart.find((item) => item.id === productId);
      if (!target) {
        return createResult(false, '购物车中未找到该商品');
      }

      target.quantity += delta;

      if (target.quantity <= 0) {
        this.cart = this.cart.filter((item) => item.id !== productId);
        this.feedbackMessage = `${target.name} 已从购物车移除`;
        return createResult(true, this.feedbackMessage);
      }

      this.feedbackMessage = `${target.name} 数量已更新`;
      return createResult(true, this.feedbackMessage);
    },

    async checkout() {
      if (!this.cart.length) {
        return createResult(false, '购物车还是空的，先挑点喜欢的商品吧');
      }

      const items = this.cart.map((item) => ({ ...item }));
      const result = await this.checkoutItems(items);
      if (result.success) {
        this.cart = [];
      }
      return result;
    },

    async buyNow(product: CatalogProduct) {
      return this.checkoutItems([{ ...product, quantity: 1 }]);
    },

    async checkoutItems(items: CartItem[]) {
      const total = calculateTotal(items);
      if (this.walletBalance < total) {
        this.feedbackMessage = '余额不足，先去充值中心补一点吧';
        return createResult(false, this.feedbackMessage);
      }

      try {
        const order = await ordersClient.create({
          fulfillmentMode: 'delivery',
          consignee: this.currentUserName || '商城用户',
          mobile: this.currentUserMobile || demoAccounts.user.account,
          address: this.defaultAddress,
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity
          }))
        });

        const [profile, apiOrders] = await Promise.all([
          memberClient.getProfile().catch(() => null),
          memberClient.getOrders().catch(() => null)
        ]);

        if (profile) {
          this.applyMemberProfile(profile);
        } else {
          this.walletBalance = Number((this.walletBalance - total).toFixed(2));
          this.points += Math.floor(total / 10);
        }

        if (apiOrders) {
          this.orders = apiOrders.map((entry) => mapApiOrderToDemoOrder(entry));
        } else {
          this.orders.unshift(mapApiOrderToDemoOrder(order, items));
        }

        this.activePanel = 'orders';
        this.selectedProduct = null;
        this.feedbackMessage = `下单成功，订单 ${order.orderNo} 已创建`;
        return createResult(true, this.feedbackMessage);
      } catch {
        this.walletBalance = Number((this.walletBalance - total).toFixed(2));
        this.points += Math.floor(total / 10);

        const order = createFallbackOrder(items);
        this.orders.unshift(order);
        this.activePanel = 'orders';
        this.selectedProduct = null;
        this.feedbackMessage = `下单成功，订单 ${order.id} 已创建`;
        return createResult(true, this.feedbackMessage);
      }
    },

    claimDailyCheckIn() {
      if (this.dailyCheckInClaimed) {
        this.feedbackMessage = '今天已经签到过了，明天再来';
        return createResult(false, this.feedbackMessage);
      }

      this.dailyCheckInClaimed = true;
      this.points += 20;
      this.feedbackMessage = '签到成功，已到账 20 积分';
      return createResult(true, this.feedbackMessage);
    },

    async recharge(amount = 100) {
      try {
        const result = await memberClient.recharge(amount);
        const profile = await memberClient.getProfile().catch(() => null);
        if (profile) {
          this.applyMemberProfile(profile);
        } else {
          this.walletBalance = result.balanceAfter;
        }
        this.activePanel = 'wallet';
        this.feedbackMessage =
          result.bonusAmount > 0
            ? `已充值 ¥${amount.toFixed(2)}，赠送 ¥${result.bonusAmount.toFixed(2)}`
            : `已充值 ¥${amount.toFixed(2)}`;
        return createResult(true, this.feedbackMessage);
      } catch {
        this.walletBalance = Number((this.walletBalance + amount).toFixed(2));
        this.feedbackMessage = `已充值 ¥${amount.toFixed(2)}`;
        this.activePanel = 'wallet';
        return createResult(true, this.feedbackMessage);
      }
    },

    handleProfileAction(action: ProfileAction) {
      switch (action) {
        case 'orders':
          this.activePanel = 'orders';
          this.feedbackMessage = '已打开我的订单';
          return createResult(true, this.feedbackMessage);
        case 'address':
          this.activePanel = 'address';
          this.feedbackMessage = '已打开收货地址';
          return createResult(true, this.feedbackMessage);
        case 'recharge':
          return this.recharge(100);
        case 'points':
          this.activePanel = 'points';
          this.feedbackMessage = '已打开积分商城';
          return createResult(true, this.feedbackMessage);
        case 'checkin':
          return this.claimDailyCheckIn();
        case 'support':
          this.activePanel = 'support';
          this.feedbackMessage = '客服入口已打开';
          return createResult(true, this.feedbackMessage);
      }
    }
  }
});
