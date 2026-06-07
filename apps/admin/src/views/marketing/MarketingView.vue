<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import {
  apiClient,
  type AdminProduct,
  type CheckinRuleItem,
  type CouponItem,
  type FlashSaleItem,
  type GroupBuyItem
} from '../../services/api';

type MarketingTab = 'coupons' | 'flash_sale' | 'group_buy' | 'checkin';

type CouponDraft = {
  title: string;
  threshold: number;
  discount: number;
  total: number;
  enabled: boolean;
};

type FlashSaleDraft = {
  title: string;
  price: number;
  stock: number;
  enabled: boolean;
};

type GroupBuyDraft = {
  title: string;
  price: number;
  groupSize: number;
  enabled: boolean;
};

const activeTab = ref<MarketingTab>('coupons');
const loading = ref(true);
const savingKey = ref('');
const errorMsg = ref('');
const successMsg = ref('');

const tabs = [
  { key: 'coupons', label: '优惠券管理' },
  { key: 'flash_sale', label: '限时秒杀' },
  { key: 'group_buy', label: '拼团活动' },
  { key: 'checkin', label: '签到规则' }
] as const;

const products = ref<AdminProduct[]>([]);
const coupons = ref<CouponItem[]>([]);
const flashSales = ref<FlashSaleItem[]>([]);
const groupBuys = ref<GroupBuyItem[]>([]);
const checkinRules = ref<CheckinRuleItem[]>([]);

const editingCouponId = ref('');
const editingFlashSaleId = ref('');
const editingGroupBuyId = ref('');

const couponDrafts = reactive<Record<string, CouponDraft>>({});
const flashSaleDrafts = reactive<Record<string, FlashSaleDraft>>({});
const groupBuyDrafts = reactive<Record<string, GroupBuyDraft>>({});

const couponForm = reactive({
  title: '',
  threshold: 99,
  discount: 10,
  total: 200
});

const flashSaleForm = reactive({
  title: '',
  productId: '',
  price: 29.9,
  stock: 30
});

const groupBuyForm = reactive({
  title: '',
  productId: '',
  price: 39.9,
  groupSize: 3
});

function syncCouponDraft(item: CouponItem) {
  couponDrafts[item.id] = {
    title: item.title,
    threshold: item.threshold,
    discount: item.discount,
    total: item.total,
    enabled: item.enabled
  };
}

function syncFlashSaleDraft(item: FlashSaleItem) {
  flashSaleDrafts[item.id] = {
    title: item.title,
    price: item.price,
    stock: item.stock,
    enabled: item.enabled
  };
}

function syncGroupBuyDraft(item: GroupBuyItem) {
  groupBuyDrafts[item.id] = {
    title: item.title,
    price: item.price,
    groupSize: item.groupSize,
    enabled: item.enabled
  };
}

function syncAllDrafts() {
  coupons.value.forEach(syncCouponDraft);
  flashSales.value.forEach(syncFlashSaleDraft);
  groupBuys.value.forEach(syncGroupBuyDraft);
}

async function loadMarketingData() {
  const [productList, couponList, flashSaleList, groupBuyList, checkinRuleList] =
    await Promise.all([
      apiClient.getProducts(),
      apiClient.getCoupons(),
      apiClient.getFlashSales(),
      apiClient.getGroupBuys(),
      apiClient.getCheckinRules()
    ]);

  products.value = productList.filter((item) => item.listed);
  coupons.value = couponList;
  flashSales.value = flashSaleList;
  groupBuys.value = groupBuyList;
  checkinRules.value = checkinRuleList.map((item) => ({ ...item }));

  if (!flashSaleForm.productId && products.value[0]) {
    flashSaleForm.productId = products.value[0].id;
  }

  if (!groupBuyForm.productId && products.value[0]) {
    groupBuyForm.productId = products.value[0].id;
  }

  syncAllDrafts();
}

onMounted(async () => {
  try {
    await loadMarketingData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '加载营销数据失败。';
  } finally {
    loading.value = false;
  }
});

const summaryCards = computed(() => [
  { label: '启用优惠券', value: `${coupons.value.filter((item) => item.enabled).length}` },
  { label: '进行中秒杀', value: `${flashSales.value.filter((item) => item.enabled).length}` },
  { label: '进行中拼团', value: `${groupBuys.value.filter((item) => item.enabled).length}` },
  { label: '签到规则档位', value: `${checkinRules.value.length}` }
]);

function replaceCoupon(updated: CouponItem) {
  coupons.value = coupons.value.map((item) => (item.id === updated.id ? updated : item));
  syncCouponDraft(updated);
}

function replaceFlashSale(updated: FlashSaleItem) {
  flashSales.value = flashSales.value.map((item) => (item.id === updated.id ? updated : item));
  syncFlashSaleDraft(updated);
}

function replaceGroupBuy(updated: GroupBuyItem) {
  groupBuys.value = groupBuys.value.map((item) => (item.id === updated.id ? updated : item));
  syncGroupBuyDraft(updated);
}

function setFeedback(type: 'success' | 'error', message: string) {
  if (type === 'success') {
    successMsg.value = message;
    errorMsg.value = '';
  } else {
    errorMsg.value = message;
    successMsg.value = '';
  }
}

function setSaving(key: string) {
  savingKey.value = key;
  errorMsg.value = '';
  successMsg.value = '';
}

function clearSaving() {
  savingKey.value = '';
}

async function createCoupon() {
  if (!couponForm.title.trim()) {
    setFeedback('error', '请填写优惠券名称。');
    return;
  }

  setSaving('create-coupon');

  try {
    const created = await apiClient.createCoupon({
      title: couponForm.title.trim(),
      threshold: Number(couponForm.threshold),
      discount: Number(couponForm.discount),
      total: Number(couponForm.total)
    });

    coupons.value = [created, ...coupons.value];
    syncCouponDraft(created);
    couponForm.title = '';
    couponForm.threshold = 99;
    couponForm.discount = 10;
    couponForm.total = 200;
    setFeedback('success', '优惠券已创建并可立即投放。');
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '创建优惠券失败。');
  } finally {
    clearSaving();
  }
}

async function saveCoupon(couponId: string) {
  const draft = couponDrafts[couponId];
  if (!draft?.title.trim()) {
    setFeedback('error', '优惠券名称不能为空。');
    return;
  }

  setSaving(`coupon-${couponId}`);

  try {
    const updated = await apiClient.updateCoupon(couponId, {
      title: draft.title.trim(),
      threshold: Number(draft.threshold),
      discount: Number(draft.discount),
      total: Number(draft.total),
      enabled: draft.enabled
    });

    replaceCoupon(updated);
    editingCouponId.value = '';
    setFeedback('success', '优惠券配置已保存。');
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '保存优惠券失败。');
  } finally {
    clearSaving();
  }
}

async function toggleCoupon(coupon: CouponItem) {
  setSaving(`coupon-toggle-${coupon.id}`);

  try {
    const updated = await apiClient.updateCoupon(coupon.id, {
      enabled: !coupon.enabled
    });

    replaceCoupon(updated);
    setFeedback('success', coupon.enabled ? '优惠券已暂停发放。' : '优惠券已重新启用。');
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '更新优惠券状态失败。');
  } finally {
    clearSaving();
  }
}

async function createFlashSale() {
  if (!flashSaleForm.productId) {
    setFeedback('error', '请先选择商品。');
    return;
  }

  setSaving('create-flash-sale');

  try {
    const created = await apiClient.createFlashSale({
      title: flashSaleForm.title.trim(),
      productId: flashSaleForm.productId,
      price: Number(flashSaleForm.price),
      stock: Number(flashSaleForm.stock)
    });

    flashSales.value = [created, ...flashSales.value];
    syncFlashSaleDraft(created);
    flashSaleForm.title = '';
    flashSaleForm.price = 29.9;
    flashSaleForm.stock = 30;
    setFeedback('success', '秒杀活动已创建并同步到首页秒杀区。');
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '创建秒杀活动失败。');
  } finally {
    clearSaving();
  }
}

async function saveFlashSale(flashSaleId: string) {
  const draft = flashSaleDrafts[flashSaleId];
  if (!draft?.title.trim()) {
    setFeedback('error', '秒杀活动名称不能为空。');
    return;
  }

  setSaving(`flash-sale-${flashSaleId}`);

  try {
    const updated = await apiClient.updateFlashSale(flashSaleId, {
      title: draft.title.trim(),
      price: Number(draft.price),
      stock: Number(draft.stock),
      enabled: draft.enabled
    });

    replaceFlashSale(updated);
    editingFlashSaleId.value = '';
    setFeedback('success', '秒杀活动已保存。');
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '保存秒杀活动失败。');
  } finally {
    clearSaving();
  }
}

async function toggleFlashSale(item: FlashSaleItem) {
  setSaving(`flash-sale-toggle-${item.id}`);

  try {
    const updated = await apiClient.updateFlashSale(item.id, {
      enabled: !item.enabled
    });

    replaceFlashSale(updated);
    setFeedback('success', item.enabled ? '秒杀活动已暂停。' : '秒杀活动已重新上线。');
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '更新秒杀状态失败。');
  } finally {
    clearSaving();
  }
}

async function createGroupBuy() {
  if (!groupBuyForm.productId) {
    setFeedback('error', '请先选择商品。');
    return;
  }

  setSaving('create-group-buy');

  try {
    const created = await apiClient.createGroupBuy({
      title: groupBuyForm.title.trim(),
      productId: groupBuyForm.productId,
      price: Number(groupBuyForm.price),
      groupSize: Number(groupBuyForm.groupSize)
    });

    groupBuys.value = [created, ...groupBuys.value];
    syncGroupBuyDraft(created);
    groupBuyForm.title = '';
    groupBuyForm.price = 39.9;
    groupBuyForm.groupSize = 3;
    setFeedback('success', '拼团活动已创建并同步到首页拼团区。');
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '创建拼团活动失败。');
  } finally {
    clearSaving();
  }
}

async function saveGroupBuy(groupBuyId: string) {
  const draft = groupBuyDrafts[groupBuyId];
  if (!draft?.title.trim()) {
    setFeedback('error', '拼团活动名称不能为空。');
    return;
  }

  setSaving(`group-buy-${groupBuyId}`);

  try {
    const updated = await apiClient.updateGroupBuy(groupBuyId, {
      title: draft.title.trim(),
      price: Number(draft.price),
      groupSize: Number(draft.groupSize),
      enabled: draft.enabled
    });

    replaceGroupBuy(updated);
    editingGroupBuyId.value = '';
    setFeedback('success', '拼团活动已保存。');
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '保存拼团活动失败。');
  } finally {
    clearSaving();
  }
}

async function toggleGroupBuy(item: GroupBuyItem) {
  setSaving(`group-buy-toggle-${item.id}`);

  try {
    const updated = await apiClient.updateGroupBuy(item.id, {
      enabled: !item.enabled
    });

    replaceGroupBuy(updated);
    setFeedback('success', item.enabled ? '拼团活动已暂停。' : '拼团活动已重新上线。');
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '更新拼团状态失败。');
  } finally {
    clearSaving();
  }
}

async function saveCheckinRules() {
  if (!checkinRules.value.length) {
    setFeedback('error', '签到规则不能为空。');
    return;
  }

  setSaving('checkin-rules');

  try {
    checkinRules.value = await apiClient.updateCheckinRules(
      checkinRules.value.map((item) => ({
        day: Number(item.day),
        reward: item.reward.trim(),
        desc: item.desc.trim()
      }))
    );

    setFeedback('success', '签到奖励规则已保存。');
  } catch (error) {
    setFeedback('error', error instanceof Error ? error.message : '保存签到规则失败。');
  } finally {
    clearSaving();
  }
}

function getStatusClass(enabled: boolean) {
  return enabled ? 'tag-success' : 'tag-muted';
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h3>营销活动</h3>
        <p>直接管理优惠券、秒杀、拼团和签到奖励，前台活动位会跟着后台启停同步更新。</p>
      </div>
    </div>

    <div v-if="errorMsg" class="info-banner error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="info-banner success">{{ successMsg }}</div>

    <section class="stats-grid">
      <article v-for="item in summaryCards" :key="item.label" class="stat-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </section>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="loading-text">加载中...</div>

    <template v-else>
      <section v-if="activeTab === 'coupons'" class="table-shell">
        <div class="section-header">
          <div>
            <strong>优惠券投放</strong>
            <p>支持直接调门槛、优惠金额、总量和启停状态。</p>
          </div>
          <div class="inline-form">
            <input v-model="couponForm.title" class="field" placeholder="优惠券名称" />
            <input v-model="couponForm.threshold" class="field small" type="number" min="0" placeholder="门槛" />
            <input v-model="couponForm.discount" class="field small" type="number" min="0" placeholder="优惠" />
            <input v-model="couponForm.total" class="field small" type="number" min="1" placeholder="总量" />
            <button class="action-btn primary" :disabled="savingKey === 'create-coupon'" @click="createCoupon">
              {{ savingKey === 'create-coupon' ? '创建中...' : '新建优惠券' }}
            </button>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>门槛</th>
              <th>优惠</th>
              <th>已领取</th>
              <th>总量</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in coupons" :key="item.id">
              <td>
                <template v-if="editingCouponId === item.id">
                  <input v-model="couponDrafts[item.id].title" class="field" />
                </template>
                <template v-else>{{ item.title }}</template>
              </td>
              <td>
                <template v-if="editingCouponId === item.id">
                  <input v-model="couponDrafts[item.id].threshold" class="field small" type="number" min="0" />
                </template>
                <template v-else>¥{{ item.threshold }}</template>
              </td>
              <td>
                <template v-if="editingCouponId === item.id">
                  <input v-model="couponDrafts[item.id].discount" class="field small" type="number" min="0" />
                </template>
                <template v-else><span class="price">¥{{ item.discount }}</span></template>
              </td>
              <td>{{ item.used }}</td>
              <td>
                <template v-if="editingCouponId === item.id">
                  <input v-model="couponDrafts[item.id].total" class="field small" type="number" :min="item.used" />
                </template>
                <template v-else>{{ item.total }}</template>
              </td>
              <td>
                <span :class="['tag', getStatusClass(item.enabled)]">{{ item.enabled ? '进行中' : '已暂停' }}</span>
              </td>
              <td>
                <div class="action-row">
                  <button
                    class="ghost-btn"
                    :disabled="savingKey.startsWith('coupon-')"
                    @click="editingCouponId = editingCouponId === item.id ? '' : item.id"
                  >
                    {{ editingCouponId === item.id ? '取消编辑' : '编辑' }}
                  </button>
                  <button
                    v-if="editingCouponId === item.id"
                    class="primary-btn"
                    :disabled="savingKey === `coupon-${item.id}`"
                    @click="saveCoupon(item.id)"
                  >
                    {{ savingKey === `coupon-${item.id}` ? '保存中...' : '保存' }}
                  </button>
                  <button
                    class="action-btn"
                    :disabled="savingKey === `coupon-toggle-${item.id}`"
                    @click="toggleCoupon(item)"
                  >
                    {{ item.enabled ? '暂停' : '启用' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="activeTab === 'flash_sale'" class="table-shell">
        <div class="section-header">
          <div>
            <strong>秒杀活动</strong>
            <p>创建后自动进入首页秒杀区，可直接调价、调库存和暂停活动。</p>
          </div>
          <div class="inline-form">
            <input v-model="flashSaleForm.title" class="field" placeholder="活动名称" />
            <select v-model="flashSaleForm.productId" class="field">
              <option value="" disabled>选择商品</option>
              <option v-for="product in products" :key="product.id" :value="product.id">
                {{ product.name }}
              </option>
            </select>
            <input v-model="flashSaleForm.price" class="field small" type="number" min="0" placeholder="秒杀价" />
            <input v-model="flashSaleForm.stock" class="field small" type="number" min="1" placeholder="库存" />
            <button
              class="action-btn primary"
              :disabled="savingKey === 'create-flash-sale' || !flashSaleForm.productId"
              @click="createFlashSale"
            >
              {{ savingKey === 'create-flash-sale' ? '创建中...' : '新建秒杀' }}
            </button>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>活动名称</th>
              <th>商品</th>
              <th>秒杀价</th>
              <th>库存</th>
              <th>已售</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in flashSales" :key="item.id">
              <td>
                <template v-if="editingFlashSaleId === item.id">
                  <input v-model="flashSaleDrafts[item.id].title" class="field" />
                </template>
                <template v-else>{{ item.title }}</template>
              </td>
              <td>{{ item.productName }}</td>
              <td>
                <template v-if="editingFlashSaleId === item.id">
                  <input v-model="flashSaleDrafts[item.id].price" class="field small" type="number" min="0" />
                </template>
                <template v-else><span class="price">¥{{ item.price }}</span></template>
              </td>
              <td>
                <template v-if="editingFlashSaleId === item.id">
                  <input v-model="flashSaleDrafts[item.id].stock" class="field small" type="number" min="0" />
                </template>
                <template v-else>{{ item.stock }}</template>
              </td>
              <td>{{ item.sold }}</td>
              <td>
                <span :class="['tag', getStatusClass(item.enabled)]">{{ item.status }}</span>
              </td>
              <td>
                <div class="action-row">
                  <button
                    class="ghost-btn"
                    :disabled="savingKey.startsWith('flash-sale-')"
                    @click="editingFlashSaleId = editingFlashSaleId === item.id ? '' : item.id"
                  >
                    {{ editingFlashSaleId === item.id ? '取消编辑' : '编辑' }}
                  </button>
                  <button
                    v-if="editingFlashSaleId === item.id"
                    class="primary-btn"
                    :disabled="savingKey === `flash-sale-${item.id}`"
                    @click="saveFlashSale(item.id)"
                  >
                    {{ savingKey === `flash-sale-${item.id}` ? '保存中...' : '保存' }}
                  </button>
                  <button
                    class="action-btn"
                    :disabled="savingKey === `flash-sale-toggle-${item.id}`"
                    @click="toggleFlashSale(item)"
                  >
                    {{ item.enabled ? '暂停' : '启用' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="activeTab === 'group_buy'" class="table-shell">
        <div class="section-header">
          <div>
            <strong>拼团活动</strong>
            <p>可直接调整拼团价、成团人数和上线状态。</p>
          </div>
          <div class="inline-form">
            <input v-model="groupBuyForm.title" class="field" placeholder="活动名称" />
            <select v-model="groupBuyForm.productId" class="field">
              <option value="" disabled>选择商品</option>
              <option v-for="product in products" :key="product.id" :value="product.id">
                {{ product.name }}
              </option>
            </select>
            <input v-model="groupBuyForm.price" class="field small" type="number" min="0" placeholder="拼团价" />
            <input v-model="groupBuyForm.groupSize" class="field small" type="number" min="2" placeholder="人数" />
            <button
              class="action-btn primary"
              :disabled="savingKey === 'create-group-buy' || !groupBuyForm.productId"
              @click="createGroupBuy"
            >
              {{ savingKey === 'create-group-buy' ? '创建中...' : '新建拼团' }}
            </button>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>活动名称</th>
              <th>商品</th>
              <th>拼团价</th>
              <th>成团人数</th>
              <th>已成团</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in groupBuys" :key="item.id">
              <td>
                <template v-if="editingGroupBuyId === item.id">
                  <input v-model="groupBuyDrafts[item.id].title" class="field" />
                </template>
                <template v-else>{{ item.title }}</template>
              </td>
              <td>{{ item.productName }}</td>
              <td>
                <template v-if="editingGroupBuyId === item.id">
                  <input v-model="groupBuyDrafts[item.id].price" class="field small" type="number" min="0" />
                </template>
                <template v-else><span class="price">¥{{ item.price }}</span></template>
              </td>
              <td>
                <template v-if="editingGroupBuyId === item.id">
                  <input v-model="groupBuyDrafts[item.id].groupSize" class="field small" type="number" min="2" />
                </template>
                <template v-else>{{ item.groupSize }} 人</template>
              </td>
              <td>{{ item.completed }}</td>
              <td>
                <span :class="['tag', getStatusClass(item.enabled)]">{{ item.status }}</span>
              </td>
              <td>
                <div class="action-row">
                  <button
                    class="ghost-btn"
                    :disabled="savingKey.startsWith('group-buy-')"
                    @click="editingGroupBuyId = editingGroupBuyId === item.id ? '' : item.id"
                  >
                    {{ editingGroupBuyId === item.id ? '取消编辑' : '编辑' }}
                  </button>
                  <button
                    v-if="editingGroupBuyId === item.id"
                    class="primary-btn"
                    :disabled="savingKey === `group-buy-${item.id}`"
                    @click="saveGroupBuy(item.id)"
                  >
                    {{ savingKey === `group-buy-${item.id}` ? '保存中...' : '保存' }}
                  </button>
                  <button
                    class="action-btn"
                    :disabled="savingKey === `group-buy-toggle-${item.id}`"
                    @click="toggleGroupBuy(item)"
                  >
                    {{ item.enabled ? '暂停' : '启用' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="activeTab === 'checkin'" class="table-shell">
        <div class="section-header">
          <div>
            <strong>签到奖励</strong>
            <p>调整签到天数档位后，会员签到获得的奖励规则将立即按新配置执行。</p>
          </div>
          <button class="action-btn primary" :disabled="savingKey === 'checkin-rules'" @click="saveCheckinRules">
            {{ savingKey === 'checkin-rules' ? '保存中...' : '保存规则' }}
          </button>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>连续天数</th>
              <th>奖励</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in checkinRules" :key="rule.day">
              <td>{{ rule.day }} 天</td>
              <td><input v-model="rule.reward" class="field" /></td>
              <td><input v-model="rule.desc" class="field" /></td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  display: grid;
  gap: 8px;
}

.stat-card span {
  font-size: 13px;
  color: #64748b;
}

.stat-card strong {
  font-size: 24px;
  color: #111827;
}

.tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  background: #ffffff;
  padding: 8px;
  border-radius: 8px;
}

.tab-btn {
  padding: 8px 20px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  color: #64748b;
}

.tab-btn.active {
  background: #7c4dff;
  color: #ffffff;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid #eef2f7;
}

.section-header strong {
  display: block;
  color: #1f2937;
  font-size: 15px;
}

.section-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.inline-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.field {
  height: 36px;
  padding: 0 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

.field:focus {
  border-color: #7c4dff;
}

.field.small {
  width: 96px;
}

.action-btn,
.ghost-btn,
.primary-btn {
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.action-btn {
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
}

.primary-btn,
.action-btn.primary {
  border: none;
  background: #7c4dff;
  color: #ffffff;
}

.ghost-btn {
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
}

.action-btn:disabled,
.ghost-btn:disabled,
.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.info-banner {
  border: 1px solid transparent;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
}

.info-banner.error {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #be123c;
}

.info-banner.success {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #047857;
}

.loading-text {
  padding: 40px;
  text-align: center;
  color: #64748b;
}

.price {
  color: #d97706;
  font-weight: 600;
}

.tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.tag-success {
  background: #dcfce7;
  color: #166534;
}

.tag-muted {
  background: #f3f4f6;
  color: #6b7280;
}

.action-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 1080px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
  }

  .inline-form {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
