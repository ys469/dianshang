<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useHomeStore } from '../stores/home';
import {
  type CatalogProduct,
  filterProducts,
  type ProfileAction,
  useDemoMallStore
} from './store';

type TabKey = 'home' | 'category' | 'cart' | 'profile';
type AuthView = 'login' | 'register' | 'reset';
type LoginMethod = 'password' | 'sms';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'home', label: '首页' },
  { key: 'category', label: '分类' },
  { key: 'cart', label: '购物车' },
  { key: 'profile', label: '我的' }
];

const profileMenus: Array<{ label: string; action: ProfileAction }> = [
  { label: '我的订单', action: 'orders' },
  { label: '收货地址', action: 'address' },
  { label: '充值中心', action: 'recharge' },
  { label: '积分商城', action: 'points' },
  { label: '签到奖励', action: 'checkin' },
  { label: '联系客服', action: 'support' }
];

const categoryKeywordMap: Record<string, string[]> = {
  food: ['蜜桃', '鲜', '礼盒', '水果', '零食'],
  beauty: ['护肤', '美妆'],
  digital: ['数码', '家电'],
  baby: ['母婴', '宝宝'],
  sports: ['运动', '户外'],
  health: ['益生菌', '保健', '健康'],
  home: ['洗衣', '家居', '百货'],
  member: ['会员', '专享']
};

const homeStore = useHomeStore();
const mallStore = useDemoMallStore();
const activeTab = ref<TabKey>('home');
const authView = ref<AuthView>('login');
const loginMethod = ref<LoginMethod>('password');

const loginForm = reactive({
  account: '',
  password: '',
  smsCode: ''
});

const registerForm = reactive({
  mobile: '',
  nickname: '',
  smsCode: '',
  password: '',
  confirmPassword: ''
});

const resetForm = reactive({
  mobile: '',
  smsCode: '',
  password: '',
  confirmPassword: ''
});

const registerCountdown = ref(0);
const resetCountdown = ref(0);
const loginCountdown = ref(0);

let registerTimer: ReturnType<typeof setInterval> | null = null;
let resetTimer: ReturnType<typeof setInterval> | null = null;
let loginTimer: ReturnType<typeof setInterval> | null = null;

const { banners, categories, notice, sections } = storeToRefs(homeStore);
const {
  activePanel,
  cart,
  cartCount,
  cartTotal,
  contactMobile,
  coupons,
  currentUserName,
  currentUserMobile,
  defaultConsignee,
  defaultAddress,
  feedbackMessage,
  isAuthenticated,
  orders,
  points,
  searchDraft,
  searchQuery,
  selectedCategoryId,
  selectedProduct,
  supportMessages,
  supportReply,
  unreadMessages,
  walletBalance
} = storeToRefs(mallStore);

const addressForm = reactive({
  defaultConsignee: '',
  contactMobile: '',
  defaultAddress: ''
});

const supportDraft = ref('');
const supportSubmitting = ref(false);
const rechargeSubmitting = ref(false);

const nowTick = ref(Date.now());
let orderClock: ReturnType<typeof setInterval> | null = null;

const confirmDialog = reactive({
  open: false,
  source: 'buy_now' as 'buy_now' | 'cart',
  items: [] as Array<CatalogProduct & { quantity: number }>,
  paymentMethod: 'balance' as 'balance' | 'wechat'
});

const confirmItemCount = computed(() =>
  confirmDialog.items.reduce((sum, item) => sum + item.quantity, 0)
);

const confirmTotal = computed(() =>
  confirmDialog.items.reduce((sum, item) => sum + item.memberPrice * item.quantity, 0)
);

const confirmedAddressSummary = computed(() => ({
  consignee: defaultConsignee.value || currentUserName.value || '未填写收货人',
  mobile: contactMobile.value || currentUserMobile.value || '未填写联系电话',
  address: defaultAddress.value || '未填写收货地址'
}));

function buildRechargeReturnUrl(rechargeNo: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('rechargeNo', rechargeNo);
  return url.toString();
}

function attachWechatRedirect(h5Url: string, rechargeNo: string) {
  const separator = h5Url.includes('?') ? '&' : '?';
  return `${h5Url}${separator}redirect_url=${encodeURIComponent(buildRechargeReturnUrl(rechargeNo))}`;
}

onMounted(() => {
  void mallStore.restoreSession().catch(() => undefined);
  void homeStore.fetchHome();
  orderClock = window.setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);

  const rechargeNo = new URL(window.location.href).searchParams.get('rechargeNo');
  if (rechargeNo) {
    void mallStore
      .restoreSession()
      .catch(() => undefined)
      .then(() => mallStore.syncRechargeStatus(rechargeNo))
      .finally(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete('rechargeNo');
      window.history.replaceState({}, '', url.toString());
      });
  }
});

onUnmounted(() => {
  if (registerTimer) {
    window.clearInterval(registerTimer);
  }
  if (resetTimer) {
    window.clearInterval(resetTimer);
  }
  if (loginTimer) {
    window.clearInterval(loginTimer);
  }
  if (orderClock) {
    window.clearInterval(orderClock);
  }
});

watch(feedbackMessage, (message, _, onCleanup) => {
  if (!message || !isAuthenticated.value) {
    return;
  }

  const timer = window.setTimeout(() => {
    mallStore.clearFeedback();
  }, 2400);

  onCleanup(() => {
    window.clearTimeout(timer);
  });
});

function switchAuthView(nextView: AuthView) {
  authView.value = nextView;
  if (nextView === 'login') {
    loginMethod.value = 'password';
    loginForm.smsCode = '';
  }
  mallStore.clearFeedback();
}

function resolveCategoryId(sectionTitle: string, product: CatalogProduct) {
  const haystack = `${sectionTitle} ${product.name} ${product.tags.join(' ')}`.toLowerCase();

  for (const [categoryId, keywords] of Object.entries(categoryKeywordMap)) {
    if (keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
      return categoryId;
    }
  }

  return null;
}

const catalogProducts = computed<CatalogProduct[]>(() =>
  sections.value.flatMap((section) =>
    section.products.map((product) => ({
      ...product,
      categoryId: resolveCategoryId(section.title, product),
      sectionId: section.id,
      sectionTitle: section.title
    }))
  )
);

const filteredCatalog = computed(() =>
  filterProducts(catalogProducts.value, searchQuery.value, selectedCategoryId.value)
);

const filteredProductIds = computed(() => new Set(filteredCatalog.value.map((item) => item.id)));

const displaySections = computed(() =>
  sections.value
    .map((section) => ({
      ...section,
      products: catalogProducts.value.filter(
        (product) =>
          product.sectionId === section.id && filteredProductIds.value.has(product.id)
      )
    }))
    .filter((section) => section.products.length > 0)
);

const categorySummaries = computed(() =>
  categories.value.map((category) => ({
    ...category,
    count: filterProducts(catalogProducts.value, '', category.id).length
  }))
);

const savingsTotal = computed(() =>
  cart.value.reduce((sum, item) => sum + (item.price - item.memberPrice) * item.quantity, 0)
);

const memberStats = computed(() => [
  { label: '余额', value: `¥${walletBalance.value.toFixed(2)}` },
  { label: '积分', value: `${points.value}` },
  { label: '优惠券', value: `${coupons.value}` },
  { label: '累计订单', value: `${orders.value.length}` }
]);

const selectedCategoryLabel = computed(
  () => categories.value.find((item) => item.id === selectedCategoryId.value)?.name ?? '全部商品'
);

const panelTitle = computed(() => {
  switch (activePanel.value) {
    case 'product':
      return '商品详情';
    case 'orders':
      return '我的订单';
    case 'address':
      return '收货地址';
    case 'wallet':
      return '充值中心';
    case 'points':
      return '积分商城';
    case 'support':
      return '在线客服';
    default:
      return '';
  }
});

function jumpToTab(tab: TabKey) {
  activeTab.value = tab;
}

function handleSearchInput(event: Event) {
  const target = event.target as HTMLInputElement;
  mallStore.setSearchDraft(target.value);
}

function handleSearchSubmit() {
  mallStore.submitSearch();
  activeTab.value = 'home';
}

function handleCategorySelect(categoryId: string) {
  mallStore.setCategory(categoryId);
  activeTab.value = 'home';
}

function handleOpenProduct(product: CatalogProduct) {
  mallStore.openProduct(product);
}

function handleAddToCart(product: CatalogProduct) {
  mallStore.addToCart(product);
}

function openCheckoutConfirm(
  items: Array<CatalogProduct & { quantity: number }>,
  source: 'buy_now' | 'cart'
) {
  if (!items.length) {
    mallStore.setFeedback('请先选择要购买的商品');
    return;
  }

  const deliveryConsignee = defaultConsignee.value.trim() || currentUserName.value.trim();
  const deliveryMobile = contactMobile.value.trim() || currentUserMobile.value.trim();
  const deliveryAddress = defaultAddress.value.trim();

  if (!deliveryConsignee || !validateMobile(deliveryMobile) || !deliveryAddress) {
    addressForm.defaultConsignee = defaultConsignee.value;
    addressForm.contactMobile = contactMobile.value || currentUserMobile.value;
    addressForm.defaultAddress = defaultAddress.value;
    mallStore.setFeedback('请先确认收货人、联系电话和收货地址');
    mallStore.openPanel('address');
    return;
  }

  confirmDialog.source = source;
  confirmDialog.items = items.map((item) => ({ ...item }));
  confirmDialog.paymentMethod = 'balance';
  confirmDialog.open = true;
}

function handleBuyNow(product: CatalogProduct) {
  openCheckoutConfirm([{ ...product, quantity: 1 }], 'buy_now');
}

function handleCheckout() {
  if (!cart.value.length) {
    mallStore.setFeedback('购物车还是空的，先挑点喜欢的商品吧');
    return;
  }

  openCheckoutConfirm(cart.value.map((item) => ({ ...item })), 'cart');
}

function handleEditAddressFromConfirm() {
  confirmDialog.open = false;
  addressForm.defaultConsignee = defaultConsignee.value;
  addressForm.contactMobile = contactMobile.value;
  addressForm.defaultAddress = defaultAddress.value;
  mallStore.openPanel('address');
}

async function handleConfirmCheckout() {
  const result = await mallStore.submitOrder(confirmDialog.items, confirmDialog.paymentMethod);
  if (result.success) {
    if (confirmDialog.source === 'cart') {
      mallStore.cart = [];
    }
    confirmDialog.open = false;
    await homeStore.fetchHome();
    activeTab.value = 'profile';
  }
}

function handleProfileAction(action: ProfileAction) {
  void mallStore.handleProfileAction(action);
  if (action === 'address') {
    addressForm.defaultConsignee = defaultConsignee.value;
    addressForm.contactMobile = contactMobile.value;
    addressForm.defaultAddress = defaultAddress.value;
  }
}

async function handleSaveAddress() {
  const result = await mallStore.updateDeliveryProfile({
    defaultConsignee: addressForm.defaultConsignee,
    contactMobile: addressForm.contactMobile,
    defaultAddress: addressForm.defaultAddress
  });

  if (result.success) {
    addressForm.defaultConsignee = defaultConsignee.value;
    addressForm.contactMobile = contactMobile.value;
    addressForm.defaultAddress = defaultAddress.value;
  }
}

async function handleWechatRecharge(amount = 100) {
  if (rechargeSubmitting.value) {
    return;
  }

  rechargeSubmitting.value = true;
  try {
    const result = await mallStore.createRechargeSession(amount, 'h5');
    if (!result.success || !result.data?.h5Url) {
      return;
    }

    window.location.href = attachWechatRedirect(result.data.h5Url, result.data.rechargeNo);
  } finally {
    rechargeSubmitting.value = false;
  }
}

async function handleSendSupportMessage() {
  if (supportSubmitting.value) {
    return;
  }

  const message = supportDraft.value.trim();
  if (!message) {
    mallStore.setFeedback('请输入要咨询的问题');
    return;
  }

  supportSubmitting.value = true;
  try {
    const result = await mallStore.sendSupportMessage(message);
    if (result.success) {
      supportDraft.value = '';
    }
  } finally {
    supportSubmitting.value = false;
  }
}

function canCancelOrder(order: { canCancel: boolean; cancelDeadlineAt: string }) {
  return order.canCancel && new Date(order.cancelDeadlineAt).getTime() > nowTick.value;
}

function getCancelCountdown(order: { cancelDeadlineAt: string }) {
  const remaining = Math.max(0, new Date(order.cancelDeadlineAt).getTime() - nowTick.value);
  const minutes = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

async function handleCancelOrder(orderNo: string) {
  const result = await mallStore.cancelOrder(orderNo);
  if (result.success) {
    await homeStore.fetchHome();
  }
}

function validateMobile(value: string) {
  return /^1[3-9]\d{9}$/.test(value);
}

function startCountdown(scene: 'register' | 'reset_password' | 'login', seconds = 60) {
  if (scene === 'register') {
    if (registerTimer) {
      window.clearInterval(registerTimer);
    }
    registerCountdown.value = seconds;
    registerTimer = window.setInterval(() => {
      registerCountdown.value -= 1;
      if (registerCountdown.value <= 0 && registerTimer) {
        window.clearInterval(registerTimer);
        registerTimer = null;
      }
    }, 1000);
    return;
  }

  if (scene === 'login') {
    if (loginTimer) {
      window.clearInterval(loginTimer);
    }
    loginCountdown.value = seconds;
    loginTimer = window.setInterval(() => {
      loginCountdown.value -= 1;
      if (loginCountdown.value <= 0 && loginTimer) {
        window.clearInterval(loginTimer);
        loginTimer = null;
      }
    }, 1000);
    return;
  }

  if (resetTimer) {
    window.clearInterval(resetTimer);
  }
  resetCountdown.value = seconds;
  resetTimer = window.setInterval(() => {
    resetCountdown.value -= 1;
    if (resetCountdown.value <= 0 && resetTimer) {
      window.clearInterval(resetTimer);
      resetTimer = null;
    }
  }, 1000);
}

async function handleSendCode(scene: 'register' | 'reset_password' | 'login') {
  const mobile = (
    scene === 'register'
      ? registerForm.mobile
      : scene === 'login'
        ? loginForm.account
        : resetForm.mobile
  ).trim();
  if (!validateMobile(mobile)) {
    mallStore.setFeedback('请输入正确的手机号');
    return;
  }

  const result = await mallStore.sendSmsCode(mobile, scene);
  if (!result.success) {
    return;
  }

  startCountdown(scene);
}

async function handleLogin() {
  const account = loginForm.account.trim();

  if (!account) {
    mallStore.setFeedback(loginMethod.value === 'password' ? '请输入账号和密码' : '请输入已注册手机号');
    return;
  }

  if (loginMethod.value === 'password') {
    if (!loginForm.password) {
      mallStore.setFeedback('请输入账号和密码');
      return;
    }

    if (loginForm.password.length < 6) {
      mallStore.setFeedback('密码至少 6 位');
      return;
    }
  } else {
    if (!validateMobile(account)) {
      mallStore.setFeedback('请输入已注册手机号');
      return;
    }

    if (!loginForm.smsCode.trim()) {
      mallStore.setFeedback('请输入短信验证码');
      return;
    }
  }

  const result =
    loginMethod.value === 'sms'
      ? await mallStore.smsLogin({
          mobile: account,
          smsCode: loginForm.smsCode.trim()
        })
      : await mallStore.login({
          role: 'user',
          account,
          password: loginForm.password
        });

  if (result.success) {
    loginForm.password = '';
    loginForm.smsCode = '';
    await homeStore.fetchHome();
  }
}

async function handleRegister() {
  if (!validateMobile(registerForm.mobile.trim())) {
    mallStore.setFeedback('请输入正确的手机号');
    return;
  }

  if (registerForm.nickname.trim().length < 2) {
    mallStore.setFeedback('昵称至少 2 个字');
    return;
  }

  if (registerForm.password.length < 6) {
    mallStore.setFeedback('密码至少 6 位');
    return;
  }

  if (registerForm.password !== registerForm.confirmPassword) {
    mallStore.setFeedback('两次输入的密码不一致');
    return;
  }

  const result = await mallStore.register({
    mobile: registerForm.mobile.trim(),
    nickname: registerForm.nickname.trim(),
    smsCode: registerForm.smsCode.trim() || undefined,
    password: registerForm.password,
    confirmPassword: registerForm.confirmPassword
  });

  if (result.success) {
    authView.value = 'login';
    registerForm.mobile = '';
    registerForm.nickname = '';
    registerForm.smsCode = '';
    registerForm.password = '';
    registerForm.confirmPassword = '';
    await homeStore.fetchHome();
  }
}

async function handleResetPassword() {
  if (!validateMobile(resetForm.mobile.trim())) {
    mallStore.setFeedback('请输入正确的手机号');
    return;
  }

  if (!resetForm.smsCode.trim()) {
    mallStore.setFeedback('请输入短信验证码');
    return;
  }

  if (resetForm.password.length < 6) {
    mallStore.setFeedback('新密码至少 6 位');
    return;
  }

  if (resetForm.password !== resetForm.confirmPassword) {
    mallStore.setFeedback('两次输入的新密码不一致');
    return;
  }

  const result = await mallStore.resetPassword({
    mobile: resetForm.mobile.trim(),
    smsCode: resetForm.smsCode.trim(),
    password: resetForm.password,
    confirmPassword: resetForm.confirmPassword
  });

  if (result.success) {
    authView.value = 'login';
    resetForm.mobile = '';
    resetForm.smsCode = '';
    resetForm.password = '';
    resetForm.confirmPassword = '';
    await homeStore.fetchHome();
  }
}

function handleLogout() {
  authView.value = 'login';
  mallStore.logout();
  activeTab.value = 'home';
}
</script>

<template>
  <div class="app-shell">
    <div v-if="!isAuthenticated" class="auth-shell">
      <section class="auth-card">
        <div class="auth-hero">
          <p class="eyebrow">智能会员商城系统</p>
          <h1>
            {{
              authView === 'login'
                ? '账号登录'
                : authView === 'register'
                  ? '注册会员账号'
                  : '找回会员密码'
            }}
          </h1>
          <p class="auth-copy">
            {{
              authView === 'login'
                ? '会员账号支持密码登录、验证码登录、注册与密码重置。'
                : authView === 'register'
                  ? '注册时需要二次确认密码，注册成功后会自动登录到会员账号。'
                  : '通过短信验证码验证身份后，可为会员账号重置登录密码。'
            }}
          </p>
        </div>

        <div v-if="feedbackMessage" class="auth-feedback">
          {{ feedbackMessage }}
        </div>

        <div v-if="authView === 'login'" class="auth-tabs">
          <button
            type="button"
            class="auth-tab"
            :class="{ active: loginMethod === 'password' }"
            @click="loginMethod = 'password'"
          >
            密码登录
          </button>
          <button
            type="button"
            class="auth-tab"
            :class="{ active: loginMethod === 'sms' }"
            @click="loginMethod = 'sms'"
          >
            验证码登录
          </button>
        </div>

        <form
          v-if="authView === 'login'"
          class="auth-form"
          @submit.prevent="handleLogin"
        >
          <label class="field">
            <span>{{ loginMethod === 'password' ? '手机号 / 账号' : '已注册手机号' }}</span>
            <input
              :value="loginForm.account"
              type="text"
              @input="loginForm.account = ($event.target as HTMLInputElement).value"
            />
          </label>
          <label v-if="loginMethod === 'password'" class="field">
            <span>密码</span>
            <input
              :value="loginForm.password"
              type="password"
              @input="loginForm.password = ($event.target as HTMLInputElement).value"
            />
          </label>
          <label v-else class="field">
            <span>短信验证码</span>
            <div class="code-row">
              <input
                :value="loginForm.smsCode"
                type="text"
                maxlength="6"
                @input="loginForm.smsCode = ($event.target as HTMLInputElement).value"
              />
              <button
                type="button"
                class="auth-tab"
                :disabled="loginCountdown > 0"
                @click="handleSendCode('login')"
              >
                {{ loginCountdown > 0 ? `${loginCountdown}s` : '发送验证码' }}
              </button>
            </div>
          </label>
          <button type="submit" class="primary-button wide">
            {{ loginMethod === 'password' ? '进入会员商城' : '验证码登录' }}
          </button>
          <button type="button" class="inline-link" @click="switchAuthView('reset')">
            忘记密码
          </button>
        </form>
        <form v-else-if="authView === 'register'" class="auth-form" @submit.prevent="handleRegister">
          <label class="field">
            <span>手机号</span>
            <input
              :value="registerForm.mobile"
              type="text"
              maxlength="11"
              @input="registerForm.mobile = ($event.target as HTMLInputElement).value"
            />
          </label>
          <label class="field">
            <span>昵称</span>
            <input
              :value="registerForm.nickname"
              type="text"
              @input="registerForm.nickname = ($event.target as HTMLInputElement).value"
            />
          </label>
          <label class="field">
            <span>短信验证码</span>
            <div class="code-row">
              <input
                :value="registerForm.smsCode"
                type="text"
                maxlength="6"
                @input="registerForm.smsCode = ($event.target as HTMLInputElement).value"
              />
              <button
                type="button"
                class="auth-tab"
                :disabled="registerCountdown > 0"
                @click="handleSendCode('register')"
              >
                {{ registerCountdown > 0 ? `${registerCountdown}s` : '发送验证码' }}
              </button>
            </div>
          </label>
          <label class="field">
            <span>密码</span>
            <input
              :value="registerForm.password"
              type="password"
              @input="registerForm.password = ($event.target as HTMLInputElement).value"
            />
          </label>
          <label class="field">
            <span>确认密码</span>
            <input
              :value="registerForm.confirmPassword"
              type="password"
              @input="registerForm.confirmPassword = ($event.target as HTMLInputElement).value"
            />
          </label>
          <button type="submit" class="primary-button wide">注册并进入会员商城</button>
        </form>

        <form v-else class="auth-form" @submit.prevent="handleResetPassword">
          <label class="field">
            <span>手机号</span>
            <input
              :value="resetForm.mobile"
              type="text"
              maxlength="11"
              @input="resetForm.mobile = ($event.target as HTMLInputElement).value"
            />
          </label>
          <label class="field">
            <span>短信验证码</span>
            <div class="code-row">
              <input
                :value="resetForm.smsCode"
                type="text"
                maxlength="6"
                @input="resetForm.smsCode = ($event.target as HTMLInputElement).value"
              />
              <button
                type="button"
                class="auth-tab"
                :disabled="resetCountdown > 0"
                @click="handleSendCode('reset_password')"
              >
                {{ resetCountdown > 0 ? `${resetCountdown}s` : '发送验证码' }}
              </button>
            </div>
          </label>
          <label class="field">
            <span>新密码</span>
            <input
              :value="resetForm.password"
              type="password"
              @input="resetForm.password = ($event.target as HTMLInputElement).value"
            />
          </label>
          <label class="field">
            <span>确认新密码</span>
            <input
              :value="resetForm.confirmPassword"
              type="password"
              @input="resetForm.confirmPassword = ($event.target as HTMLInputElement).value"
            />
          </label>
          <button type="submit" class="primary-button wide">重置密码</button>
        </form>
        <div class="auth-notice">
          <p>会员账号可直接注册，登录后即可使用购物、下单、充值和售后等功能。</p>
        </div>

        <div class="auth-switches">
          <button
            v-if="authView !== 'register'"
            type="button"
            class="ghost-button wide"
            @click="switchAuthView('register')"
          >
            没有账号？注册会员
          </button>
          <button
            v-if="authView !== 'login'"
            type="button"
            class="ghost-button wide"
            @click="switchAuthView('login')"
          >
            已有账号？返回登录
          </button>
        </div>

      </section>
    </div>

    <div v-else class="page-frame">
      <header class="topbar">
        <div>
          <p class="eyebrow">智能会员商城系统</p>
          <h1>会员商城</h1>
          <p class="muted-text">{{ currentUserName }} 已登录</p>
        </div>
        <div class="header-actions">
          <button type="button" class="message-button" @click="handleProfileAction('support')">
            消息
            <span v-if="unreadMessages" class="count-badge">{{ unreadMessages }}</span>
          </button>
          <button type="button" class="ghost-button" @click="handleLogout">退出</button>
        </div>
      </header>

      <main class="content">
        <section v-if="activeTab === 'home'" class="view-stack">
          <section class="hero-panel">
            <form class="search-row" @submit.prevent="handleSearchSubmit">
              <label class="search-box">
                <input
                  :value="searchDraft"
                  type="search"
                  class="search-input"
                  placeholder="搜索商品 / 品牌 / 活动"
                  @input="handleSearchInput"
                />
              </label>
              <button type="submit" class="primary-button search-button">搜索</button>
              <button type="button" class="member-button" @click="handleProfileAction('points')">
                会员专享
              </button>
            </form>

            <div class="notice-row">
              <span class="notice-tag">公告</span>
              <span class="notice-text">{{ notice || '新人专享券与秒杀活动已上线' }}</span>
            </div>

            <div class="banner-strip">
              <article v-for="banner in banners" :key="banner.id" class="banner-card">
                <img :src="banner.image" :alt="banner.title" class="banner-image" />
                <div class="banner-overlay">
                  <p class="banner-title">{{ banner.title }}</p>
                  <p class="banner-subtitle">会员价、拼团、限时折扣同步进行中</p>
                </div>
              </article>
            </div>
          </section>

          <section class="section-block">
            <div class="section-head">
              <h2>分类导航</h2>
              <span>{{ selectedCategoryLabel }}</span>
            </div>
            <div class="category-grid">
              <button
                v-for="item in categories"
                :key="item.id"
                type="button"
                class="category-item"
                :class="{ active: selectedCategoryId === item.id }"
                @click="handleCategorySelect(item.id)"
              >
                <span class="category-icon">{{ item.name.slice(0, 1) }}</span>
                <span>{{ item.name }}</span>
              </button>
            </div>
          </section>

          <section v-if="!displaySections.length" class="section-block empty-state">
            <h2>没有找到匹配商品</h2>
            <p>换个关键词试试，或者清空当前搜索和分类条件。</p>
            <button type="button" class="ghost-button" @click="mallStore.setCategory(null)">
              清空筛选
            </button>
          </section>

          <section
            v-for="section in displaySections"
            :key="section.id"
            class="section-block"
          >
            <div class="section-head">
              <h2>{{ section.title }}</h2>
              <span>{{ section.products.length }} 件可选</span>
            </div>
            <div class="product-grid">
              <article v-for="product in section.products" :key="product.id" class="product-card">
                <button type="button" class="product-card-main" @click="handleOpenProduct(product)">
                  <img :src="product.image" :alt="product.name" class="product-image" />
                  <div class="product-body">
                    <div class="tag-row">
                      <span v-for="tag in product.tags" :key="tag" class="tag-chip">{{ tag }}</span>
                    </div>
                    <h3>{{ product.name }}</h3>
                    <p class="muted-text">{{ product.sectionTitle }}</p>
                    <div class="price-row">
                      <strong>¥{{ product.memberPrice }}</strong>
                      <span>¥{{ product.price }}</span>
                    </div>
                  </div>
                </button>
                <div class="product-actions">
                  <button type="button" class="ghost-button" @click="handleAddToCart(product)">
                    加入购物车
                  </button>
                  <button type="button" class="member-button action-button" @click="handleBuyNow(product)">
                    立即购买
                  </button>
                </div>
              </article>
            </div>
          </section>
        </section>

        <section v-else-if="activeTab === 'category'" class="view-stack">
          <section class="section-block">
            <div class="section-head">
              <h2>全部分类</h2>
              <span>点击后回到首页展示对应商品</span>
            </div>
            <div class="category-list">
              <button
                v-for="item in categorySummaries"
                :key="item.id"
                type="button"
                class="category-panel"
                @click="handleCategorySelect(item.id)"
              >
                <div>
                  <p class="category-panel-title">{{ item.name }}</p>
                  <p class="muted-text">当前可展示 {{ item.count }} 件商品</p>
                </div>
                <span class="tag-chip">{{ item.id }}</span>
              </button>
            </div>
          </section>
        </section>

        <section v-else-if="activeTab === 'cart'" class="view-stack">
          <section class="section-block">
            <div class="section-head">
              <h2>购物车</h2>
              <span>{{ cartCount }} 件商品</span>
            </div>

            <div v-if="cart.length" class="cart-list">
              <article v-for="item in cart" :key="item.id" class="cart-item">
                <img :src="item.image" :alt="item.name" class="cart-image" />
                <div class="cart-body">
                  <h3>{{ item.name }}</h3>
                  <p class="muted-text">会员价 ¥{{ item.memberPrice }} / 件</p>
                  <div class="quantity-row">
                    <button type="button" class="step-button" @click="mallStore.updateCartQuantity(item.id, -1)">-</button>
                    <span>{{ item.quantity }}</span>
                    <button type="button" class="step-button" @click="mallStore.updateCartQuantity(item.id, 1)">+</button>
                  </div>
                </div>
                <strong>¥{{ (item.memberPrice * item.quantity).toFixed(2) }}</strong>
              </article>
            </div>

            <div v-else class="empty-state">
              <h2>购物车还是空的</h2>
              <p>从首页挑选商品加入购物车后，就可以提交订单。</p>
              <button type="button" class="ghost-button" @click="jumpToTab('home')">去逛逛</button>
            </div>

            <div class="checkout-panel">
              <div>
                <p class="summary-label">合计</p>
                <p class="summary-total">¥{{ cartTotal.toFixed(2) }}</p>
                <p class="summary-savings">已节省 ¥{{ savingsTotal.toFixed(2) }}</p>
              </div>
              <button type="button" class="checkout-button" @click="handleCheckout">去结算</button>
            </div>
          </section>
        </section>

        <section v-else class="view-stack">
          <section class="profile-hero">
            <div class="avatar">会</div>
            <div>
              <p class="eyebrow">会员中心</p>
              <h2>{{ currentUserName }}</h2>
              <p class="muted-text">成长值 {{ points }}，钱包余额可用于购物与充值消费。</p>
            </div>
          </section>

          <section class="section-block">
            <div class="stats-grid">
              <article v-for="item in memberStats" :key="item.label" class="stat-card">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </article>
            </div>
          </section>

          <section class="section-block">
            <div class="section-head">
              <h2>常用功能</h2>
              <span>会员注册、登录、充值和订单已互相关联</span>
            </div>
            <div class="menu-list">
              <button
                v-for="item in profileMenus"
                :key="item.label"
                type="button"
                class="menu-item"
                @click="handleProfileAction(item.action)"
              >
                <span>{{ item.label }}</span>
                <span>></span>
              </button>
            </div>
          </section>
        </section>
      </main>

      <aside v-if="activePanel" class="panel-overlay" @click.self="mallStore.closePanel()">
        <section class="detail-panel">
          <div class="panel-header">
            <h2>{{ panelTitle }}</h2>
            <button type="button" class="close-button" @click="mallStore.closePanel()">关闭</button>
          </div>

          <div v-if="activePanel === 'product' && selectedProduct" class="panel-content">
            <img :src="selectedProduct.image" :alt="selectedProduct.name" class="panel-product-image" />
            <div class="tag-row">
              <span v-for="tag in selectedProduct.tags" :key="tag" class="tag-chip">{{ tag }}</span>
            </div>
            <h3>{{ selectedProduct.name }}</h3>
            <p class="muted-text">{{ selectedProduct.sectionTitle }}</p>
            <div class="price-row">
              <strong>¥{{ selectedProduct.memberPrice }}</strong>
              <span>¥{{ selectedProduct.price }}</span>
            </div>
            <div class="panel-actions">
              <button type="button" class="ghost-button" @click="handleAddToCart(selectedProduct)">
                加入购物车
              </button>
              <button type="button" class="member-button action-button" @click="handleBuyNow(selectedProduct)">
                立即购买
              </button>
            </div>
          </div>

          <div v-else-if="activePanel === 'orders'" class="panel-content">
            <div v-if="orders.length" class="order-list">
              <article v-for="order in orders" :key="order.id" class="order-card">
                <div class="section-head compact">
                  <strong>{{ order.orderNo }}</strong>
                  <span>{{ order.status }}</span>
                </div>
                <p class="muted-text">{{ order.createdAt }}</p>
                <p class="muted-text">共 {{ order.itemCount }} 件商品</p>
                <p class="muted-text">收货地址：{{ order.address || '请先完善收货地址' }}</p>
                <p class="summary-total small">¥{{ order.total.toFixed(2) }}</p>
                <div class="order-actions">
                  <span v-if="canCancelOrder(order)" class="countdown-chip">
                    可撤回 {{ getCancelCountdown(order) }}
                  </span>
                  <button
                    v-if="canCancelOrder(order)"
                    type="button"
                    class="ghost-button"
                    @click="handleCancelOrder(order.orderNo)"
                  >
                    撤回订单
                  </button>
                </div>
              </article>
            </div>
            <div v-else class="empty-state compact">
              <h2>还没有订单</h2>
              <p>从首页点一次立即购买，这里就会出现订单记录。</p>
            </div>
          </div>

          <div v-else-if="activePanel === 'address'" class="panel-content">
            <div class="panel-form">
              <label class="panel-field">
                <span>收货人</span>
                <input
                  :value="addressForm.defaultConsignee"
                  type="text"
                  placeholder="填写收货人姓名"
                  @input="addressForm.defaultConsignee = ($event.target as HTMLInputElement).value"
                />
              </label>
              <label class="panel-field">
                <span>联系电话</span>
                <input
                  :value="addressForm.contactMobile"
                  type="text"
                  maxlength="11"
                  placeholder="填写联系电话"
                  @input="addressForm.contactMobile = ($event.target as HTMLInputElement).value"
                />
              </label>
              <label class="panel-field">
                <span>收货地址</span>
                <textarea
                  :value="addressForm.defaultAddress"
                  class="panel-textarea"
                  rows="4"
                  placeholder="填写详细收货地址"
                  @input="addressForm.defaultAddress = ($event.target as HTMLTextAreaElement).value"
                />
              </label>
            </div>
            <article class="info-card">
              <strong>当前默认地址</strong>
              <p>{{ defaultAddress || '还没有保存收货地址' }}</p>
            </article>
            <button type="button" class="member-button action-button" @click="handleSaveAddress">
              保存收货信息
            </button>
          </div>

          <div v-else-if="activePanel === 'wallet'" class="panel-content">
            <article class="info-card">
              <strong>当前余额</strong>
              <p class="summary-total small">¥{{ walletBalance.toFixed(2) }}</p>
            </article>
            <article class="info-card">
              <strong>微信充值</strong>
              <p>充值后将跳转到微信支付完成付款，支付成功后余额会自动回写到账户。</p>
            </article>
            <button
              type="button"
              class="member-button action-button"
              :disabled="rechargeSubmitting"
              @click="handleWechatRecharge(100)"
            >
              {{ rechargeSubmitting ? '正在拉起微信支付...' : '微信充值 ¥100' }}
            </button>
          </div>

          <div v-else-if="activePanel === 'points'" class="panel-content">
            <article class="info-card">
              <strong>当前积分</strong>
              <p class="summary-total small">{{ points }}</p>
            </article>
            <article class="info-card">
              <strong>兑换说明</strong>
              <p>积分可以兑换会员专区商品、优惠券和签到礼包。</p>
            </article>
            <button type="button" class="ghost-button" @click="mallStore.claimDailyCheckIn()">
              领取今日签到奖励
            </button>
          </div>

          <div v-else-if="activePanel === 'support'" class="panel-content">
            <article class="info-card">
              <strong>在线客服</strong>
              <p>{{ supportReply }}</p>
            </article>
            <div class="support-chat">
              <article
                v-for="message in supportMessages"
                :key="message.id"
                :class="['chat-bubble', `chat-${message.role}`]"
              >
                <strong>{{ message.role === 'assistant' ? 'AI 客服' : '我' }}</strong>
                <p>{{ message.content }}</p>
              </article>
            </div>
            <label class="panel-field">
              <span>输入问题</span>
              <textarea
                :value="supportDraft"
                class="panel-textarea"
                rows="3"
                placeholder="例如：我的订单什么时候发货？"
                @input="supportDraft = ($event.target as HTMLTextAreaElement).value"
              />
            </label>
            <button
              type="button"
              class="member-button action-button"
              :disabled="supportSubmitting"
              @click="handleSendSupportMessage"
            >
              {{ supportSubmitting ? 'AI 正在回复...' : '发送给 AI 客服' }}
            </button>
          </div>
        </section>
      </aside>

      <aside v-if="confirmDialog.open" class="panel-overlay" @click.self="confirmDialog.open = false">
        <section class="detail-panel confirm-panel">
          <div class="panel-header">
            <h2>确认下单</h2>
            <button type="button" class="close-button" @click="confirmDialog.open = false">关闭</button>
          </div>

          <div class="panel-content">
            <article class="info-card">
              <strong>商品信息</strong>
              <p>共 {{ confirmItemCount }} 件商品，合计 ¥{{ confirmTotal.toFixed(2) }}</p>
            </article>

            <div class="order-preview-list">
              <article v-for="item in confirmDialog.items" :key="item.id" class="info-card compact-card">
                <strong>{{ item.name }}</strong>
                <p>{{ item.quantity }} 件，会员价 ¥{{ item.memberPrice }}</p>
              </article>
            </div>

            <article class="info-card">
              <strong>请确认收货地址是否正确</strong>
              <p>{{ confirmedAddressSummary.consignee }} / {{ confirmedAddressSummary.mobile }}</p>
              <p>{{ confirmedAddressSummary.address }}</p>
            </article>

            <div class="panel-actions confirm-actions">
              <button type="button" class="ghost-button" @click="handleEditAddressFromConfirm">
                修改地址
              </button>
              <button type="button" class="member-button action-button" @click="handleConfirmCheckout">
                确认提交订单
              </button>
            </div>
          </div>
        </section>
      </aside>

      <transition name="fade">
        <div v-if="feedbackMessage && isAuthenticated" class="toast">{{ feedbackMessage }}</div>
      </transition>

      <nav class="tabbar">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="tab-button"
          :class="{ active: activeTab === tab.key }"
          @click="jumpToTab(tab.key)"
        >
          <span>{{ tab.label }}</span>
          <span v-if="tab.key === 'cart' && cartCount" class="tab-count">{{ cartCount }}</span>
        </button>
      </nav>
    </div>
  </div>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(html),
:global(body),
:global(#app) {
  overflow-x: hidden;
}

:global(body) {
  margin: 0;
  background: #f5f7fa;
  color: #1f2a37;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

:global(button),
:global(input),
:global(select) {
  font: inherit;
}

h1,
h2,
h3,
p {
  margin: 0;
}

.app-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(124, 77, 255, 0.16), transparent 28%),
    linear-gradient(180deg, #fbfbfe 0%, #f5f7fa 42%, #eef2f8 100%);
}

.auth-shell,
.admin-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.auth-card,
.admin-frame,
.page-frame {
  width: min(100%, 520px);
}

.auth-card,
.hero-panel,
.section-block,
.profile-hero,
.detail-panel,
.stat-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(124, 77, 255, 0.08);
  border-radius: 20px;
  box-shadow: 0 18px 40px rgba(124, 77, 255, 0.08);
}

.auth-card,
.hero-panel,
.section-block {
  padding: 18px;
}

.page-frame {
  min-height: 100vh;
  margin: 0 auto;
  padding: 24px 16px 96px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #7c4dff;
  font-size: 12px;
  font-weight: 700;
}

.auth-copy,
.muted-text,
.summary-label,
.summary-savings,
.stat-card span,
.field span,
.auth-notice p,
.empty-state p,
.admin-console-copy {
  color: #667085;
  font-size: 13px;
}

.auth-feedback {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(124, 77, 255, 0.1);
  color: #5b34d0;
  font-size: 13px;
  line-height: 1.6;
}

.auth-shell h1,
.topbar h1,
.admin-topbar h1 {
  font-size: 28px;
}

.auth-card,
.content,
.view-stack,
.category-list,
.cart-list,
.menu-list,
.stats-grid,
.order-list,
.panel-content,
.admin-frame,
.shortcut-grid {
  display: grid;
  gap: 16px;
}

.topbar,
.search-row,
.notice-row,
.section-head,
.category-panel,
.cart-item,
.checkout-panel,
.profile-hero,
.menu-item,
.panel-header,
.quantity-row,
.panel-actions,
.header-actions,
.admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.topbar,
.admin-topbar {
  gap: 16px;
  margin-bottom: 20px;
}

.auth-tabs,
.stats-grid,
.shortcut-grid {
  display: grid;
}

.auth-tabs {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.auth-tab,
.category-item,
.menu-item,
.tab-button,
.step-button,
.product-card-main,
.shortcut-card,
.message-button,
.ghost-button,
.member-button,
.primary-button,
.checkout-button,
.close-button {
  border: 0;
  cursor: pointer;
}

.auth-tab,
.message-button,
.ghost-button,
.member-button,
.primary-button,
.close-button {
  padding: 10px 14px;
  border-radius: 12px;
}

.auth-tab,
.ghost-button,
.close-button {
  background: #f7f5ff;
  color: #7c4dff;
}

.auth-tab.active,
.primary-button,
.checkout-button,
.member-button {
  background: linear-gradient(135deg, #7c4dff 0%, #5f35db 100%);
  color: #ffffff;
}

.wide {
  width: 100%;
}

.auth-switches {
  display: grid;
  gap: 10px;
}

.auth-form,
.field {
  display: grid;
  gap: 10px;
}

.code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: 10px;
}

.inline-link {
  justify-self: end;
  padding: 0;
  border: 0;
  background: transparent;
  color: #7c4dff;
  cursor: pointer;
}

.field input,
.search-input {
  width: 100%;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: #f7f5ff;
  color: #374151;
  outline: none;
}

.field input:focus,
.search-input:focus {
  border-color: rgba(124, 77, 255, 0.36);
}

.panel-form,
.panel-field {
  display: grid;
  gap: 10px;
}

.panel-field span {
  color: #667085;
  font-size: 13px;
}

.panel-field input,
.panel-textarea {
  width: 100%;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: #f7f5ff;
  color: #374151;
  outline: none;
  resize: vertical;
}

.panel-field input:focus,
.panel-textarea:focus {
  border-color: rgba(124, 77, 255, 0.36);
}

.support-chat {
  display: grid;
  gap: 10px;
  max-height: 280px;
  overflow-y: auto;
}

.chat-bubble {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 14px;
}

.chat-bubble strong {
  font-size: 12px;
}

.chat-bubble p {
  margin: 0;
  line-height: 1.55;
}

.chat-assistant {
  background: #f7f5ff;
  color: #433467;
}

.chat-user {
  background: rgba(124, 77, 255, 0.12);
  color: #4b2ab3;
}

.member-button:disabled,
.ghost-button:disabled,
.primary-button:disabled,
.close-button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.message-button {
  position: relative;
  background: rgba(124, 77, 255, 0.12);
  color: #6b3df2;
}

.count-badge,
.tab-count {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ffd54f;
  color: #5b4300;
  font-size: 11px;
  font-weight: 700;
}

.count-badge {
  position: absolute;
  top: -6px;
  right: -4px;
}

.search-row {
  gap: 12px;
  margin-bottom: 14px;
}

.search-box {
  flex: 1;
}

.search-button {
  min-width: 72px;
}

.notice-row {
  gap: 12px;
  justify-content: flex-start;
  margin-bottom: 14px;
}

.notice-tag {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 213, 79, 0.24);
  color: #8a5b00;
  font-size: 12px;
  font-weight: 700;
}

.notice-text {
  color: #475467;
  font-size: 13px;
}

.banner-strip,
.product-grid {
  display: grid;
  gap: 12px;
}

.banner-strip {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.banner-card {
  position: relative;
  min-height: 180px;
  border-radius: 18px;
  overflow: hidden;
  background: #ddd6fe;
}

.banner-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
}

.banner-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  padding: 18px;
  color: #ffffff;
  background: linear-gradient(180deg, transparent 24%, rgba(17, 24, 39, 0.72) 100%);
}

.banner-title {
  font-size: 22px;
  font-weight: 700;
}

.banner-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.88);
}

.section-head {
  margin-bottom: 14px;
}

.section-head.compact {
  margin-bottom: 6px;
}

.section-head span {
  color: #6b7280;
  font-size: 12px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.category-item {
  display: grid;
  gap: 10px;
  justify-items: center;
  min-height: 110px;
  padding: 14px 8px;
  border-radius: 18px;
  background: #faf8ff;
  color: #334155;
}

.category-item.active {
  background: linear-gradient(135deg, rgba(124, 77, 255, 0.18), rgba(255, 213, 79, 0.22));
  color: #5b34d0;
}

.category-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(124, 77, 255, 0.12);
  color: #7c4dff;
  font-weight: 700;
}

.product-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.product-card {
  display: grid;
  border-radius: 18px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #eef2ff;
}

.product-card-main {
  display: grid;
  padding: 0;
  background: transparent;
  text-align: left;
}

.product-image,
.cart-image,
.panel-product-image {
  object-fit: cover;
  display: block;
}

.product-image {
  width: 100%;
  height: 188px;
}

.product-body {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.product-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 0 14px 14px;
}

.action-button {
  width: 100%;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(124, 77, 255, 0.1);
  color: #7c4dff;
  font-size: 12px;
  font-weight: 600;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.price-row strong {
  color: #7c4dff;
  font-size: 22px;
}

.price-row span {
  color: #94a3b8;
  font-size: 13px;
  text-decoration: line-through;
}

.category-panel,
.cart-item,
.stat-card,
.info-card,
.order-card {
  padding: 14px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid #eef2ff;
}

.cart-item {
  gap: 12px;
  align-items: stretch;
}

.cart-image {
  width: 92px;
  height: 92px;
  border-radius: 16px;
}

.cart-body {
  flex: 1;
  display: grid;
  gap: 8px;
  align-content: center;
}

.quantity-row {
  justify-content: flex-start;
  gap: 10px;
}

.step-button {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #f4f0ff;
  color: #6942f4;
}

.checkout-panel {
  gap: 16px;
  padding: 16px;
  margin-top: 14px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(124, 77, 255, 0.12), rgba(255, 213, 79, 0.18));
}

.summary-total {
  margin-top: 4px;
  font-size: 26px;
  font-weight: 700;
  color: #111827;
}

.summary-total.small {
  font-size: 20px;
}

.profile-hero {
  gap: 16px;
  padding: 18px;
}

.avatar {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 22px;
  background: linear-gradient(135deg, #7c4dff 0%, #5f35db 100%);
  color: #ffffff;
  font-size: 24px;
  font-weight: 700;
}

.stats-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stat-card {
  display: grid;
  gap: 8px;
}

.stat-card strong {
  font-size: 22px;
}

.menu-item {
  padding: 16px 0;
  background: transparent;
  border-bottom: 1px solid #edf2ff;
  color: #111827;
}

.menu-item:last-child {
  border-bottom: 0;
}

.empty-state {
  display: grid;
  gap: 10px;
}

.empty-state.compact {
  gap: 8px;
}

.shortcut-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.admin-console-panel,
.admin-console-actions {
  display: grid;
  gap: 12px;
}

.shortcut-card {
  display: grid;
  gap: 8px;
  min-height: 96px;
  padding: 14px;
  border-radius: 18px;
  background: #faf8ff;
  color: #4c31c9;
}

.shortcut-card span {
  font-size: 12px;
  color: #6b7280;
}

.shortcut-card small {
  color: #7c4dff;
  font-size: 12px;
  font-weight: 700;
}

.shortcut-card.active {
  background: linear-gradient(135deg, rgba(124, 77, 255, 0.18), rgba(255, 213, 79, 0.18));
}

.panel-overlay {
  position: fixed;
  inset: 0;
  display: grid;
  align-items: end;
  background: rgba(15, 23, 42, 0.38);
  padding: 18px 12px 96px;
}

.detail-panel {
  width: min(100%, 456px);
  margin: 0 auto;
  padding: 18px;
}

.panel-product-image {
  width: 100%;
  height: 220px;
  border-radius: 18px;
}

.info-card {
  display: grid;
  gap: 8px;
}

.compact-card {
  padding: 12px;
}

.order-preview-list,
.order-actions,
.confirm-actions {
  display: grid;
  gap: 10px;
}

.countdown-chip {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(124, 77, 255, 0.1);
  color: #6a3ef0;
  font-size: 12px;
  font-weight: 600;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 92px;
  transform: translateX(-50%);
  max-width: calc(100% - 32px);
  padding: 12px 16px;
  border-radius: 999px;
  background: rgba(17, 24, 39, 0.9);
  color: #ffffff;
  font-size: 13px;
  box-shadow: 0 18px 40px rgba(17, 24, 39, 0.2);
}

.tabbar {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  width: min(calc(100% - 24px), 456px);
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 8px;
  border-radius: 22px;
  background: rgba(17, 24, 39, 0.88);
  backdrop-filter: blur(14px);
  box-shadow: 0 20px 40px rgba(17, 24, 39, 0.18);
}

.tab-button {
  position: relative;
  min-height: 44px;
  padding: 10px 8px;
  border-radius: 14px;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
}

.tab-button.active {
  background: #ffffff;
  color: #111827;
  font-weight: 700;
}

.tab-count {
  position: absolute;
  top: 4px;
  right: 8px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 540px) {
  .banner-strip,
  .product-grid,
  .shortcut-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .category-grid,
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 420px) {
  .page-frame,
  .auth-shell,
  .admin-shell {
    padding-inline: 12px;
  }

  .search-row {
    display: grid;
    grid-template-columns: 1fr;
  }

  .header-actions {
    display: grid;
    gap: 8px;
  }
}
</style>
