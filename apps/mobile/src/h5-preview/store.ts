import { defineStore } from 'pinia';
import {
  authClient,
  memberClient,
  ordersClient,
  type HomePayload,
  type MemberProfile,
  type OrderPayload
} from '../services/api';
import { removeClientStorageItem, setClientStorageItem } from '../services/client-storage';

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
  orderNo: string;
  createdAt: string;
  itemCount: number;
  total: number;
  status: string;
  customerName: string;
  customerMobile: string;
  address: string;
  paymentMethod: 'balance' | 'wechat';
  paymentState: 'pending' | 'success' | 'failed' | 'closed';
  paymentChannel: 'balance' | 'native' | 'h5' | null;
  canCancel: boolean;
  cancelDeadlineAt: string;
  cancelledAt: string | null;
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

const INITIAL_WALLET_BALANCE = 0;
const INITIAL_POINTS = 0;
const INITIAL_COUPONS = 0;
const TOKEN_KEY = 'smart-member-mobile-token';
const USER_KEY = 'smart-member-mobile-user';


function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function isValidMobile(value: string) {
  return /^1[3-9]\d{9}$/.test(value);
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
  const createdAt = new Date(timestamp).toISOString();

  return {
    id: `SO-${timestamp}`,
    orderNo: `SO-${timestamp}`,
    createdAt,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: calculateTotal(items),
    status: '\u5f85\u53d1\u8d27',
    customerName: '',
    customerMobile: '',
    address: '',
    paymentMethod: 'balance',
    paymentState: 'success',
    paymentChannel: 'balance',
    canCancel: true,
    cancelDeadlineAt: new Date(timestamp + 3 * 60 * 1000).toISOString(),
    cancelledAt: null,
    items
  };
}

function createResult(success: boolean, message: string) {
  return { success, message };
}

function setStorageItem(key: string, value: string) {
  setClientStorageItem(key, value);
}

function removeStorageItem(key: string) {
  removeClientStorageItem(key);
}

function mapApiOrderToDemoOrder(order: OrderPayload, items: CartItem[] = []): DemoOrder {
  return {
    id: order.orderNo,
    orderNo: order.orderNo,
    createdAt: order.createdAt,
    itemCount: order.itemCount,
    total: order.payableAmount,
    status: order.status,
    customerName: order.customerName,
    customerMobile: order.customerMobile,
    address: order.address,
    paymentMethod: order.paymentMethod,
    paymentState: order.paymentState,
    paymentChannel: order.paymentChannel,
    canCancel: order.canCancel,
    cancelDeadlineAt: order.cancelDeadlineAt,
    cancelledAt: order.cancelledAt,
    items
  };
}

function createEmptyMemberState() {
  return {
    walletBalance: INITIAL_WALLET_BALANCE,
    points: INITIAL_POINTS,
    coupons: INITIAL_COUPONS,
    orders: [] as DemoOrder[]
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
    coupons: INITIAL_COUPONS,
    dailyCheckInClaimed: false,
    activePanel: null as ActivePanel,
    activeAdminShortcut: null as AdminShortcutKey | null,
    selectedProduct: null as CatalogProduct | null,
    feedbackMessage: '',
    unreadMessages: 2,
    defaultConsignee: '',
    contactMobile: '',
    defaultAddress: '',
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
      this.currentUserName = profile.defaultConsignee || profile.nickname;
      this.currentUserMobile = profile.contactMobile || profile.mobile;
      this.walletBalance = profile.balance;
      this.points = profile.points;
      this.coupons = profile.coupons;
      this.defaultConsignee = profile.defaultConsignee || profile.nickname;
      this.contactMobile = profile.contactMobile || profile.mobile;
      this.defaultAddress = profile.defaultAddress || '';
    },

    resetMemberSessionData() {
      const emptyState = createEmptyMemberState();
      this.walletBalance = emptyState.walletBalance;
      this.points = emptyState.points;
      this.coupons = emptyState.coupons;
      this.orders = emptyState.orders;
      this.defaultAddress = '';
      this.cart = [];
      this.activePanel = null;
      this.selectedProduct = null;
      this.dailyCheckInClaimed = false;
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
        this.defaultConsignee = result.user.nickname;
        this.contactMobile = result.user.mobile ?? payload.account;
        this.activeAdminShortcut = payload.role === 'admin' ? 'products' : null;
        setStorageItem(TOKEN_KEY, result.token);
        setStorageItem(USER_KEY, JSON.stringify(result.user));

        if (payload.role === 'user') {
          await this.syncMemberData().catch(() => undefined);
        }

        this.feedbackMessage =
          payload.role === 'admin'
            ? '\u7ba1\u7406\u5458\u767b\u5f55\u6210\u529f\uff0c\u5df2\u8fdb\u5165\u8fd0\u8425\u540e\u53f0'
            : '\u4f1a\u5458\u767b\u5f55\u6210\u529f\uff0c\u6b22\u8fce\u56de\u6765';
        return createResult(true, this.feedbackMessage);
      } catch (error) {
        this.isAuthenticated = false;
        this.currentRole = payload.role;
        this.currentUserName = '';
        this.currentUserMobile = '';
        this.defaultConsignee = '';
        this.contactMobile = '';
        this.defaultAddress = '';
        this.activeAdminShortcut = null;
        removeStorageItem(TOKEN_KEY);
        removeStorageItem(USER_KEY);
        this.feedbackMessage =
          error instanceof Error
            ? error.message
            : payload.role === 'admin'
              ? '\u7ba1\u7406\u5458\u8d26\u53f7\u6216\u5bc6\u7801\u9519\u8bef'
              : '\u624b\u673a\u53f7\u6216\u5bc6\u7801\u9519\u8bef';
        return createResult(false, this.feedbackMessage);
      }
    },

    async register(payload: RegisterPayload) {
      try {
        const result = await authClient.register(
          payload.mobile,
          payload.nickname,
          payload.password,
          payload.confirmPassword
        );

        this.isAuthenticated = true;
        this.currentRole = 'user';
        this.currentUserName = result.user.nickname;
        this.currentUserMobile = result.user.mobile ?? payload.mobile;
        this.defaultConsignee = result.user.nickname;
        this.contactMobile = result.user.mobile ?? payload.mobile;
        this.activeAdminShortcut = null;
        this.resetMemberSessionData();
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
        this.feedbackMessage =
          result.provider === 'mock' && result.debugCode
            ? `短信通道尚未配置真实发送，当前验证码：${result.debugCode}`
            : '\u9a8c\u8bc1\u7801\u5df2\u53d1\u9001\uff0c\u8bf7\u6ce8\u610f\u67e5\u6536\u77ed\u4fe1';
        return {
          success: true,
          message: this.feedbackMessage
        };
      } catch (error) {
        this.feedbackMessage =
          error instanceof Error ? error.message : '\u9a8c\u8bc1\u7801\u53d1\u9001\u5931\u8d25';
        return createResult(false, this.feedbackMessage);
      }
    },

    async updateDeliveryProfile(payload: {
      defaultConsignee: string;
      contactMobile: string;
      defaultAddress: string;
    }) {
      const defaultConsignee = payload.defaultConsignee.trim();
      const contactMobile = payload.contactMobile.trim();
      const defaultAddress = payload.defaultAddress.trim();

      if (!defaultConsignee) {
        this.feedbackMessage = '请先填写收货人';
        return createResult(false, this.feedbackMessage);
      }
      if (!isValidMobile(contactMobile)) {
        this.feedbackMessage = '请输入正确的联系电话';
        return createResult(false, this.feedbackMessage);
      }
      if (!defaultAddress) {
        this.feedbackMessage = '请先填写收货地址';
        return createResult(false, this.feedbackMessage);
      }

      try {
        const profile = await memberClient.updateProfile({
          defaultConsignee,
          contactMobile,
          defaultAddress
        });
        this.applyMemberProfile(profile);
      } catch {
        this.currentUserName = defaultConsignee;
        this.currentUserMobile = contactMobile;
        this.defaultConsignee = defaultConsignee;
        this.contactMobile = contactMobile;
        this.defaultAddress = defaultAddress;
      }

      this.feedbackMessage = '收货信息已保存';
      return createResult(true, this.feedbackMessage);
    },

    logout() {
      this.isAuthenticated = false;
      this.currentRole = 'user';
      this.currentUserName = '';
      this.currentUserMobile = '';
      this.defaultConsignee = '';
      this.contactMobile = '';
      this.cart = [];
      this.orders = [];
      this.walletBalance = INITIAL_WALLET_BALANCE;
      this.points = INITIAL_POINTS;
      this.coupons = INITIAL_COUPONS;
      this.defaultAddress = '';
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

    async checkout(paymentMethod: 'balance' | 'wechat' = 'balance') {
      if (!this.cart.length) {
        return createResult(false, '\u8d2d\u7269\u8f66\u8fd8\u662f\u7a7a\u7684\uff0c\u5148\u6311\u70b9\u559c\u6b22\u7684\u5546\u54c1\u5427');
      }

      const items = this.cart.map((item) => ({ ...item }));
      const result = await this.submitOrder(items, paymentMethod);
      if (result.success) {
        this.cart = [];
      }
      return result;
    },

    async buyNow(product: CatalogProduct, paymentMethod: 'balance' | 'wechat' = 'balance') {
      return this.submitOrder([{ ...product, quantity: 1 }], paymentMethod);
    },

    async submitOrder(
      items: CartItem[],
      paymentMethod: 'balance' | 'wechat' = 'balance'
    ) {
      const total = calculateTotal(items);
      const consignee = this.defaultConsignee.trim() || this.currentUserName.trim();
      const contactMobile = this.contactMobile.trim() || this.currentUserMobile.trim();
      const defaultAddress = this.defaultAddress.trim();

      if (!consignee || !isValidMobile(contactMobile) || !defaultAddress) {
        this.feedbackMessage =
          '\u8bf7\u5148\u5b8c\u5584\u6536\u8d27\u4eba\u3001\u8054\u7cfb\u7535\u8bdd\u548c\u6536\u8d27\u5730\u5740';
        return createResult(false, this.feedbackMessage);
      }
      if (paymentMethod === 'balance' && this.walletBalance < total) {
        this.feedbackMessage = '\u4f59\u989d\u4e0d\u8db3\uff0c\u8bf7\u5148\u5145\u503c\u540e\u518d\u63d0\u4ea4\u8ba2\u5355';
        return createResult(false, this.feedbackMessage);
      }

      try {
        const order = await ordersClient.create({
          fulfillmentMode: 'delivery',
          paymentMethod,
          consignee,
          mobile: contactMobile,
          address: defaultAddress,
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
        } else if (paymentMethod === 'balance') {
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
        this.feedbackMessage =
          '\u4e0b\u5355\u6210\u529f\uff0c\u8ba2\u5355 ' + order.orderNo + ' \u5df2\u521b\u5efa';
        return createResult(true, this.feedbackMessage);
      } catch (error) {
        this.feedbackMessage =
          error instanceof Error ? error.message : '\u4e0b\u5355\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5';
        return createResult(false, this.feedbackMessage);
      }
    },

    async cancelOrder(orderNo: string) {
      try {
        const order = await ordersClient.cancel(orderNo);
        const [profile, apiOrders] = await Promise.all([
          memberClient.getProfile().catch(() => null),
          memberClient.getOrders().catch(() => null)
        ]);

        if (profile) {
          this.applyMemberProfile(profile);
        }

        if (apiOrders) {
          this.orders = apiOrders.map((entry) => mapApiOrderToDemoOrder(entry));
        } else {
          const mappedOrder = mapApiOrderToDemoOrder(order);
          const existingIndex = this.orders.findIndex(
            (entry) => entry.orderNo === orderNo || entry.id === orderNo
          );
          if (existingIndex >= 0) {
            this.orders.splice(existingIndex, 1, mappedOrder);
          } else {
            this.orders.unshift(mappedOrder);
          }
        }

        this.feedbackMessage = '\u8ba2\u5355\u5df2\u64a4\u56de';
        return createResult(true, this.feedbackMessage);
      } catch (error) {
        this.feedbackMessage =
          error instanceof Error ? error.message : '\u64a4\u56de\u8ba2\u5355\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5';
        return createResult(false, this.feedbackMessage);
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
            ? '\u5df2\u5145\u503c \u00a5' + amount.toFixed(2) + '\uff0c\u8d60\u9001 \u00a5' + result.bonusAmount.toFixed(2)
            : '\u5df2\u5145\u503c \u00a5' + amount.toFixed(2);
        return createResult(true, this.feedbackMessage);
      } catch (error) {
        this.feedbackMessage =
          error instanceof Error ? error.message : '\u5145\u503c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5';
        return createResult(false, this.feedbackMessage);
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
