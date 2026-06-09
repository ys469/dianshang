import { defineStore } from 'pinia';
import {
  authClient,
  memberClient,
  ordersClient,
  paymentsClient,
  type CheckInPayload,
  type HomePayload,
  type MerchantConversationPayload,
  type MemberCouponPayload,
  type MemberProfile,
  type OrderPayload,
  type PasswordResetPayload,
  type WechatRechargeSessionPayload
} from '../services/api';
import {
  getClientStorageItem,
  removeClientStorageItem,
  setClientStorageItem
} from '../services/client-storage';

export type DemoProduct = HomePayload['sections'][number]['products'][number];

export interface CatalogProduct extends DemoProduct {
  categoryId?: string | null;
  sectionId?: string;
  sectionTitle?: string;
  sectionType?: string;
}

export interface PurchaseItem extends CatalogProduct {
  quantity: number;
  pricingSourceType?: string;
  lineId?: string;
}

export interface CartItem extends PurchaseItem {
  pricingSourceType: string;
  lineId: string;
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
  couponTitle?: string | null;
  couponDiscount?: number;
  logisticsCompany?: string | null;
  trackingNo?: string | null;
  shippedAt?: string | null;
  completedAt?: string | null;
  items: Array<
    PurchaseItem & {
      productId?: string;
      productName?: string;
    }
  >;
}

export interface OrderSuccessNotice {
  orderNo: string;
  total: number;
  itemCount: number;
  createdAt: string;
}

export interface SupportMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
}

export interface MerchantMessage {
  id: string;
  senderRole: 'member' | 'admin';
  senderName: string;
  content: string;
  createdAt: string;
}

export type ActivePanel =
  | 'product'
  | 'orders'
  | 'address'
  | 'wallet'
  | 'coupons'
  | 'points'
  | 'support'
  | 'merchant'
  | null;

export type ProfileAction =
  | 'orders'
  | 'address'
  | 'recharge'
  | 'coupons'
  | 'points'
  | 'checkin'
  | 'support'
  | 'merchant';

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

export interface SmsLoginPayload {
  mobile: string;
  smsCode: string;
}

export interface RegisterPayload {
  mobile: string;
  email: string;
  nickname: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordPayload {
  mobile: string;
  email: string;
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
let merchantPollingTimer: ReturnType<typeof window.setInterval> | null = null;


function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function isValidMobile(value: string) {
  return /^1[3-9]\d{9}$/.test(value);
}

export function filterProducts<
  T extends {
    name: string;
    tags: string[];
    categoryId?: string | null;
    subtitle?: string;
    description?: string;
    categoryName?: string;
  }
>(
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

    const haystack = normalizeSearchValue(
      [
        product.name,
        product.subtitle ?? '',
        product.description ?? '',
        product.categoryName ?? '',
        product.categoryId ?? '',
        product.tags.join(' ')
      ].join(' ')
    );
    return haystack.includes(normalizedQuery);
  });
}

function calculateTotal(items: Array<{ memberPrice: number; quantity: number }>) {
  return Number(
    items.reduce((sum, item) => sum + item.memberPrice * item.quantity, 0).toFixed(2)
  );
}

function resolvePricingSourceType(item: Pick<PurchaseItem, 'pricingSourceType' | 'sectionType'>) {
  return item.pricingSourceType || item.sectionType || 'catalog';
}

function createCartLineId(productId: string, pricingSourceType: string) {
  return `${productId}::${pricingSourceType}`;
}

function normalizePurchaseItem<T extends PurchaseItem>(
  item: T
): T & { pricingSourceType: string; lineId: string } {
  const pricingSourceType = resolvePricingSourceType(item);

  return {
    ...item,
    pricingSourceType,
    lineId: item.lineId || createCartLineId(item.id, pricingSourceType)
  };
}

function resolveCouponDiscount(
  coupons: MemberCouponPayload[],
  couponId: string | null | undefined,
  orderAmount: number
) {
  if (!couponId) {
    return 0;
  }

  const coupon = coupons.find((item) => item.id === couponId);
  if (!coupon || !coupon.enabled || coupon.remainingCount <= 0 || orderAmount < coupon.threshold) {
    return 0;
  }

  return Number(Math.min(coupon.discount, orderAmount).toFixed(2));
}

function createFallbackOrder(items: PurchaseItem[]): DemoOrder {
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

function createResult<T = undefined>(success: boolean, message: string, data?: T) {
  return { success, message, data };
}

function setStorageItem(key: string, value: string) {
  setClientStorageItem(key, value);
}

function removeStorageItem(key: string) {
  removeClientStorageItem(key);
}

function mapApiOrderToDemoOrder(order: OrderPayload, items: PurchaseItem[] = []): DemoOrder {
  const mappedItems =
    order.items?.length
      ? order.items.map((item) => ({
          id: item.productId,
          productId: item.productId,
          productName: item.productName,
          name: item.productName,
          price: item.price,
          memberPrice: item.memberPrice,
          image: '',
          tags: [],
          quantity: item.quantity,
          pricingSourceType: item.pricingSourceType,
          pricingContextId: item.pricingContextId ?? null,
          lineId: createCartLineId(item.productId, item.pricingSourceType || 'catalog')
        }))
      : items;

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
    couponTitle: order.couponTitle ?? null,
    couponDiscount: order.couponDiscount ?? 0,
    logisticsCompany: order.logisticsCompany ?? null,
    trackingNo: order.trackingNo ?? null,
    shippedAt: order.shippedAt ?? null,
    completedAt: order.completedAt ?? null,
    items: mappedItems
  };
}

function createEmptyMemberState() {
  return {
    walletBalance: INITIAL_WALLET_BALANCE,
    points: INITIAL_POINTS,
    coupons: INITIAL_COUPONS,
    memberCoupons: [] as MemberCouponPayload[],
    orders: [] as DemoOrder[],
    dailyCheckInClaimed: false,
    orderSuccessNotice: null as OrderSuccessNotice | null
  };
}

function isTodayDate(value: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function createSupportGreeting(): SupportMessage {
  return {
    id: 'support-greeting',
    role: 'assistant',
    content: '您好，我是智能会员商城 AI 客服，可以帮您查询订单、余额、积分、收货地址和充值问题。',
    createdAt: new Date().toISOString()
  };
}

function mapMerchantConversation(
  payload: MerchantConversationPayload | null | undefined
): MerchantMessage[] {
  return (payload?.messages ?? []).map((message) => ({
    id: message.id,
    senderRole: message.senderRole,
    senderName: message.senderName,
    content: message.content,
    createdAt: message.createdAt
  }));
}

export const useDemoMallStore = defineStore('demo-mall', {
  state: () => {
    const state = ({
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
    memberCoupons: [] as MemberCouponPayload[],
    dailyCheckInClaimed: false,
    activePanel: null as ActivePanel,
    activeAdminShortcut: null as AdminShortcutKey | null,
    selectedProduct: null as CatalogProduct | null,
    feedbackMessage: '',
    orderSuccessNotice: null as OrderSuccessNotice | null,
    unreadMessages: 0,
    defaultConsignee: '',
    contactMobile: '',
    defaultAddress: '',
    supportMessages: [createSupportGreeting()] as SupportMessage[],
    supportReply: '在线客服通常会在 5 分钟内响应。',
    merchantMessages: [] as MerchantMessage[],
    merchantReplyHint: '商家会在营业时段尽快回复，并可直接查看您的订单与联系方式。',
    orderSubmitting: false
    }) as any;
    state.supportReply = 'AI 客服可协助查询订单、余额、积分、充值和优惠券问题。';
    state.merchantReplyHint = '商家会在营业时段尽快回复，并可直接查看您的订单与联系方式。';
    return state;
  },
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
      this.dailyCheckInClaimed = isTodayDate(profile.lastCheckInAt);
    },

    applyMerchantConversation(payload: MerchantConversationPayload | null | undefined) {
      this.merchantMessages = mapMerchantConversation(payload);
      this.unreadMessages = payload?.unreadCount ?? 0;
    },

    async syncMerchantConversation() {
      if (!this.isAuthenticated || this.currentRole !== 'user') {
        return null;
      }

      try {
        const conversation = await memberClient.getMerchantMessages();
        this.applyMerchantConversation(conversation);
        return conversation;
      } catch {
        return null;
      }
    },

    startMerchantMessagePolling(intervalMs = 3000) {
      if (typeof window === 'undefined' || merchantPollingTimer) {
        return;
      }

      merchantPollingTimer = window.setInterval(() => {
        if (!this.isAuthenticated || this.currentRole !== 'user' || this.activePanel !== 'merchant') {
          return;
        }

        void this.syncMerchantConversation();
      }, intervalMs);
    },

    stopMerchantMessagePolling() {
      if (merchantPollingTimer) {
        window.clearInterval(merchantPollingTimer);
        merchantPollingTimer = null;
      }
    },

    resetMemberSessionData() {
      const emptyState = createEmptyMemberState();
      this.stopMerchantMessagePolling();
      this.walletBalance = emptyState.walletBalance;
      this.points = emptyState.points;
      this.coupons = emptyState.coupons;
      this.memberCoupons = emptyState.memberCoupons;
      this.orders = emptyState.orders;
      this.dailyCheckInClaimed = emptyState.dailyCheckInClaimed;
      this.orderSuccessNotice = emptyState.orderSuccessNotice;
      this.defaultAddress = '';
      this.cart = [];
      this.activePanel = null;
      this.selectedProduct = null;
      this.supportMessages = [createSupportGreeting()];
      this.merchantMessages = [];
      this.unreadMessages = 0;
    },

    async syncMemberData() {
      const [profile, orders, memberCoupons, merchantConversation] = await Promise.all([
        memberClient.getProfile(),
        memberClient.getOrders().catch(() => []),
        memberClient.getCoupons().catch(() => []),
        memberClient.getMerchantMessages().catch(() => null)
      ]);

      this.applyMemberProfile(profile);
      this.memberCoupons = memberCoupons;
      this.orders = orders.map((order) => mapApiOrderToDemoOrder(order));
      this.applyMerchantConversation(merchantConversation);
    },

    async restoreSession() {
      const token = getClientStorageItem(TOKEN_KEY);
      const rawUser = getClientStorageItem(USER_KEY);

      if (!token || !rawUser) {
        return createResult(false, '未找到已保存的登录状态');
      }

      try {
        const user = JSON.parse(rawUser) as {
          nickname: string;
          mobile?: string | null;
          role: LoginRole;
        };

        if (user.role === 'admin') {
          this.logout();
          this.feedbackMessage = '管理员请前往独立后台登录';
          return createResult(false, this.feedbackMessage);
        }

        this.isAuthenticated = true;
        this.currentRole = user.role;
        this.currentUserName = user.nickname;
        this.currentUserMobile = user.mobile ?? '';
        this.defaultConsignee = user.nickname;
        this.contactMobile = user.mobile ?? '';
        this.activeAdminShortcut = null;

        await this.syncMemberData();

        return createResult(true, '已恢复登录状态');
      } catch (error) {
        this.logout();
        return createResult(
          false,
          error instanceof Error ? error.message : '恢复登录状态失败'
        );
      }
    },

    async login(payload: LoginPayload) {
      if (payload.role === 'admin') {
        this.logout();
        this.feedbackMessage = '管理员请前往独立后台登录';
        return createResult(false, this.feedbackMessage);
      }

      try {
        const result = await authClient.login(payload.role, payload.account, payload.password);
        this.isAuthenticated = true;
        this.currentRole = payload.role;
        this.currentUserName = result.user.nickname;
        this.currentUserMobile = result.user.mobile ?? payload.account;
        this.defaultConsignee = result.user.nickname;
        this.contactMobile = result.user.mobile ?? payload.account;
        this.activeAdminShortcut = null;
        setStorageItem(TOKEN_KEY, result.token);
        setStorageItem(USER_KEY, JSON.stringify(result.user));

        await this.syncMemberData().catch(() => undefined);
        this.feedbackMessage = '会员登录成功，欢迎回来';
        return createResult(true, this.feedbackMessage, result);

        this.feedbackMessage = '\u4f1a\u5458\u767b\u5f55\u6210\u529f\uff0c\u6b22\u8fce\u56de\u6765';
        this.feedbackMessage =
          result.provider === 'mock' && result.debugPassword
            ? `新密码已生成：${result.debugPassword}，请使用该密码登录后尽快修改。`
            : '新的临时密码已发送到您的邮箱，请注意查收。';
        return createResult(true, this.feedbackMessage, result as PasswordResetPayload);
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
          error instanceof Error ? error.message : '\u624b\u673a\u53f7\u6216\u5bc6\u7801\u9519\u8bef';
        return createResult(false, this.feedbackMessage);
      }
    },

    async smsLogin(payload: SmsLoginPayload) {
      try {
        const result = await authClient.smsLogin(payload.mobile, payload.smsCode);
        this.isAuthenticated = true;
        this.currentRole = 'user';
        this.currentUserName = result.user.nickname;
        this.currentUserMobile = result.user.mobile ?? payload.mobile;
        this.defaultConsignee = result.user.nickname;
        this.contactMobile = result.user.mobile ?? payload.mobile;
        this.activeAdminShortcut = null;
        setStorageItem(TOKEN_KEY, result.token);
        setStorageItem(USER_KEY, JSON.stringify(result.user));
        await this.syncMemberData().catch(() => undefined);
        this.feedbackMessage = '会员登录成功，欢迎回来';
        return createResult(true, this.feedbackMessage);
      } catch (error) {
        this.feedbackMessage = error instanceof Error ? error.message : '验证码登录失败';
        return createResult(false, this.feedbackMessage);
      }
    },

    async register(payload: RegisterPayload) {
      try {
        const result = await authClient.register(
          payload.mobile,
          payload.email,
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
        const result = await authClient.resetPassword(payload.mobile, payload.email);
        this.feedbackMessage =
          result.provider === 'mock' && result.debugPassword
            ? `新的临时密码：${result.debugPassword}，请登录后尽快修改。`
            : '新的临时密码已发送到您的邮箱，请注意查收。';
        return createResult(true, this.feedbackMessage, result);
        this.feedbackMessage = '密码已重置，请使用新密码登录';
        return createResult(true, this.feedbackMessage);
      } catch (error) {
        this.feedbackMessage = error instanceof Error ? error.message : '重置密码失败';
        return createResult(false, this.feedbackMessage);
      }
    },

    async sendSmsCode(mobile: string, scene: 'register' | 'reset_password' | 'login') {
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
      this.stopMerchantMessagePolling();
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
      this.dailyCheckInClaimed = false;
      this.supportMessages = [createSupportGreeting()];
      this.merchantMessages = [];
      this.unreadMessages = 0;
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

    openPanel(
      panel: ActivePanel,
      options: {
        syncMerchantConversation?: boolean;
      } = {}
    ) {
      const shouldSyncMerchantConversation = options.syncMerchantConversation ?? true;

      if (panel !== 'merchant') {
        this.stopMerchantMessagePolling();
      }

      this.activePanel = panel;

      if (panel === 'merchant') {
        if (shouldSyncMerchantConversation) {
          void this.syncMerchantConversation();
        }
        this.startMerchantMessagePolling();
      }
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
      if (this.activePanel === 'merchant') {
        this.stopMerchantMessagePolling();
      }

      this.activePanel = null;
      this.selectedProduct = null;
    },

    setFeedback(message: string) {
      this.feedbackMessage = message;
    },

    clearFeedback() {
      this.feedbackMessage = '';
    },

    clearOrderSuccessNotice() {
      this.orderSuccessNotice = null;
    },

    addToCart(product: CatalogProduct) {
      const normalizedProduct = normalizePurchaseItem({ ...product, quantity: 1 });
      const existing = this.cart.find((item) => item.lineId === normalizedProduct.lineId);

      if (existing) {
        existing.quantity += 1;
      } else {
        this.cart.push(normalizedProduct);
      }

      this.feedbackMessage = `${product.name} 已加入购物车`;
      return createResult(true, this.feedbackMessage);
    },

    updateCartQuantity(lineId: string, delta: number) {
      const target = this.cart.find((item) => item.lineId === lineId);
      if (!target) {
        return createResult(false, '购物车中未找到该商品');
      }

      target.quantity += delta;

      if (target.quantity <= 0) {
        this.cart = this.cart.filter((item) => item.lineId !== lineId);
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
      items: PurchaseItem[],
      paymentMethod: 'balance' | 'wechat' = 'balance',
      couponId?: string | null
    ) {
      if (this.orderSubmitting) {
        this.feedbackMessage = '订单正在提交，请不要重复点击';
        return createResult(false, this.feedbackMessage);
      }

      const normalizedItems = items.map((item) => normalizePurchaseItem(item));
      const total = calculateTotal(normalizedItems);
      const couponDiscount = resolveCouponDiscount(this.memberCoupons, couponId, total);
      const payableAmount = Number(Math.max(0, total - couponDiscount).toFixed(2));
      const consignee = this.defaultConsignee.trim() || this.currentUserName.trim();
      const contactMobile = this.contactMobile.trim() || this.currentUserMobile.trim();
      const defaultAddress = this.defaultAddress.trim();

      if (!consignee || !isValidMobile(contactMobile) || !defaultAddress) {
        this.feedbackMessage =
          '\u8bf7\u5148\u5b8c\u5584\u6536\u8d27\u4eba\u3001\u8054\u7cfb\u7535\u8bdd\u548c\u6536\u8d27\u5730\u5740';
        return createResult(false, this.feedbackMessage);
      }
      if (paymentMethod === 'balance' && this.walletBalance < payableAmount) {
        this.feedbackMessage = '\u4f59\u989d\u4e0d\u8db3\uff0c\u8bf7\u5148\u5145\u503c\u540e\u518d\u63d0\u4ea4\u8ba2\u5355';
        return createResult(false, this.feedbackMessage);
      }

      this.orderSubmitting = true;

      try {
        const order = await ordersClient.create({
          fulfillmentMode: 'delivery',
          paymentMethod,
          consignee,
          mobile: contactMobile,
          address: defaultAddress,
          couponId: couponId ?? undefined,
          items: normalizedItems.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            pricingSourceType: item.pricingSourceType,
            pricingContextId: item.pricingContextId ?? null,
            expectedUnitPrice: item.memberPrice
          }))
        });

        const [profile, apiOrders, memberCoupons] = await Promise.all([
          memberClient.getProfile().catch(() => null),
          memberClient.getOrders().catch(() => null),
          memberClient.getCoupons().catch(() => null)
        ]);

        if (profile) {
          this.applyMemberProfile(profile);
        } else if (paymentMethod === 'balance') {
          this.walletBalance = Number((this.walletBalance - payableAmount).toFixed(2));
          this.points += Math.floor(payableAmount / 10);
        }

        if (apiOrders) {
          this.orders = apiOrders.map((entry) => mapApiOrderToDemoOrder(entry));
        } else {
          this.orders.unshift(mapApiOrderToDemoOrder(order, normalizedItems));
        }

        if (memberCoupons) {
          this.memberCoupons = memberCoupons;
        }

        const createdOrder = apiOrders?.find((entry) => entry.orderNo === order.orderNo) ?? order;

        this.activePanel = 'orders';
        this.selectedProduct = null;
        this.orderSuccessNotice = {
          orderNo: createdOrder.orderNo,
          total: createdOrder.payableAmount,
          itemCount: createdOrder.itemCount,
          createdAt: createdOrder.createdAt
        };
        this.feedbackMessage =
          '\u4e0b\u5355\u6210\u529f\uff0c\u8ba2\u5355 ' + order.orderNo + ' \u5df2\u521b\u5efa';
        return createResult(true, this.feedbackMessage);
      } catch (error) {
        this.feedbackMessage =
          error instanceof Error ? error.message : '\u4e0b\u5355\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5';
        return createResult(false, this.feedbackMessage);
      } finally {
        this.orderSubmitting = false;
      }
    },

    async cancelOrder(orderNo: string) {
      try {
        const order = await ordersClient.cancel(orderNo);
        const [profile, apiOrders, memberCoupons] = await Promise.all([
          memberClient.getProfile().catch(() => null),
          memberClient.getOrders().catch(() => null),
          memberClient.getCoupons().catch(() => null)
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

        if (memberCoupons) {
          this.memberCoupons = memberCoupons;
        }

        this.feedbackMessage = '\u8ba2\u5355\u5df2\u64a4\u56de';
        return createResult(true, this.feedbackMessage);
      } catch (error) {
        this.feedbackMessage =
          error instanceof Error ? error.message : '\u64a4\u56de\u8ba2\u5355\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5';
        return createResult(false, this.feedbackMessage);
      }
    },

    async claimDailyCheckIn() {
      if (this.dailyCheckInClaimed) {
        this.feedbackMessage = '今天已经签到过了，明天再来';
        return createResult(false, this.feedbackMessage);
      }

      try {
        const result = await memberClient.claimDailyCheckIn();
        const memberCoupons = await memberClient.getCoupons().catch(() => null);
        this.applyMemberProfile(result.profile);
        if (memberCoupons) {
          this.memberCoupons = memberCoupons;
        }
        this.dailyCheckInClaimed = true;
        this.feedbackMessage =
          result.rewardCoupons > 0
            ? `签到成功，已到账 ${result.rewardPoints} 积分，并发放 ${result.rewardCoupons} 张优惠券`
            : `签到成功，已到账 ${result.rewardPoints} 积分`;
        return createResult(true, this.feedbackMessage, result);
      } catch (error) {
        this.feedbackMessage =
          error instanceof Error ? error.message : '签到失败，请稍后重试';
        return createResult(false, this.feedbackMessage);
      }
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

    async createRechargeSession(
      amount = 100,
      channel: 'native' | 'h5' = 'h5',
      payerClientIp?: string
    ) {
      try {
        const payload: {
          amount: number;
          channel: 'native' | 'h5';
          payerClientIp?: string;
        } = {
          amount,
          channel
        };

        if (payerClientIp) {
          payload.payerClientIp = payerClientIp;
        }

        const session = await paymentsClient.createRechargeSession(payload);
        this.activePanel = 'wallet';
        this.feedbackMessage = `已创建微信充值订单 ${session.rechargeNo}，等待支付完成`;
        return createResult(true, this.feedbackMessage, session);
      } catch (error) {
        this.feedbackMessage =
          error instanceof Error ? error.message : '充值发起失败，请稍后重试';
        return createResult(false, this.feedbackMessage);
      }
    },

    async syncRechargeStatus(rechargeNo: string) {
      try {
        const recharge = await paymentsClient.getRechargeStatus(rechargeNo);
        if (recharge.paymentState === 'success') {
          const profile = await memberClient.getProfile().catch(() => null);
          if (profile) {
            this.applyMemberProfile(profile);
          } else {
            this.walletBalance = recharge.balanceAfter;
          }
          this.feedbackMessage = '充值已到账，余额已更新';
        } else {
          this.feedbackMessage = '充值订单仍在处理中，请稍后刷新';
        }

        this.activePanel = 'wallet';
        return createResult(true, this.feedbackMessage, recharge);
      } catch (error) {
        this.feedbackMessage =
          error instanceof Error ? error.message : '充值状态查询失败，请稍后重试';
        return createResult(false, this.feedbackMessage);
      }
    },

    async sendSupportMessage(message: string) {
      const content = message.trim();
      if (!content) {
        this.feedbackMessage = '请输入要咨询的问题';
        return createResult(false, this.feedbackMessage);
      }

      const history = this.supportMessages
        .filter((entry) => entry.id !== 'support-greeting')
        .map((entry) => ({
          role: entry.role,
          content: entry.content
        }));

      this.supportMessages.push({
        id: `support-user-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date().toISOString()
      });

      try {
        const result = await memberClient.sendSupportMessage({
          message: content,
          history
        });

        this.supportMessages.push({
          id: `support-assistant-${Date.now()}`,
          role: 'assistant',
          content: result.reply,
          createdAt: new Date().toISOString()
        });
        this.supportReply = result.reply;
        this.activePanel = 'support';
        this.feedbackMessage = 'AI 客服已回复';
        return createResult(true, this.feedbackMessage, result);
      } catch (error) {
        this.supportMessages.pop();
        this.feedbackMessage =
          error instanceof Error ? error.message : '客服消息发送失败，请稍后重试';
        return createResult(false, this.feedbackMessage);
      }
    },

    async sendMerchantMessage(message: string) {
      const content = message.trim();
      if (!content) {
        this.feedbackMessage = '请输入想发送给商家的内容';
        return createResult(false, this.feedbackMessage);
      }

      try {
        const result = await memberClient.sendMerchantMessage({
          message: content
        });
        this.applyMerchantConversation(result);
        this.openPanel('merchant', { syncMerchantConversation: false });
        this.feedbackMessage = '已发送给商家';
        return createResult(true, this.feedbackMessage, result);
      } catch (error) {
        this.feedbackMessage =
          error instanceof Error ? error.message : '商家消息发送失败，请稍后重试';
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
          this.activePanel = 'wallet';
          this.feedbackMessage = '已打开充值中心';
          return createResult(true, this.feedbackMessage);
        case 'coupons':
          this.activePanel = 'coupons';
          this.feedbackMessage = '已打开优惠券';
          return createResult(true, this.feedbackMessage);
        case 'points':
          this.activePanel = 'points';
          this.feedbackMessage = '已打开积分商城';
          return createResult(true, this.feedbackMessage);
        case 'checkin':
          return this.claimDailyCheckIn();
        case 'merchant':
          this.openPanel('merchant');
          this.feedbackMessage = '已打开商家消息';
          return createResult(true, this.feedbackMessage);
        case 'support':
          this.activePanel = 'support';
          this.feedbackMessage = 'AI 客服会话已打开';
          return createResult(true, this.feedbackMessage);
      }
    }
  }
});
