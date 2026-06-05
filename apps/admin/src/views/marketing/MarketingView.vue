<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import {
  apiClient,
  type AdminProduct,
  type CheckinRuleItem,
  type CouponItem,
  type FlashSaleItem,
  type GroupBuyItem
} from '../../services/api';

const activeTab = ref<'coupons' | 'flash_sale' | 'group_buy' | 'checkin'>('coupons');
const loading = ref(true);
const saving = ref(false);
const errorMsg = ref('');

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

async function loadMarketingData() {
  const [productList, couponList, flashSaleList, groupBuyList, checkinRuleList] = await Promise.all([
    apiClient.getProducts(),
    apiClient.getCoupons(),
    apiClient.getFlashSales(),
    apiClient.getGroupBuys(),
    apiClient.getCheckinRules()
  ]);

  products.value = productList;
  coupons.value = couponList;
  flashSales.value = flashSaleList;
  groupBuys.value = groupBuyList;
  checkinRules.value = checkinRuleList;

  if (!flashSaleForm.productId && products.value[0]) {
    flashSaleForm.productId = products.value[0].id;
  }
  if (!groupBuyForm.productId && products.value[0]) {
    groupBuyForm.productId = products.value[0].id;
  }
}

onMounted(async () => {
  try {
    await loadMarketingData();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '加载营销数据失败';
  } finally {
    loading.value = false;
  }
});

async function createCoupon() {
  saving.value = true;
  errorMsg.value = '';
  try {
    const created = await apiClient.createCoupon(couponForm);
    coupons.value.unshift(created);
    couponForm.title = '';
    couponForm.threshold = 99;
    couponForm.discount = 10;
    couponForm.total = 200;
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '创建优惠券失败';
  } finally {
    saving.value = false;
  }
}

async function createFlashSale() {
  saving.value = true;
  errorMsg.value = '';
  try {
    const created = await apiClient.createFlashSale(flashSaleForm);
    flashSales.value.unshift(created);
    flashSaleForm.title = '';
    flashSaleForm.price = 29.9;
    flashSaleForm.stock = 30;
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '创建秒杀活动失败';
  } finally {
    saving.value = false;
  }
}

async function createGroupBuy() {
  saving.value = true;
  errorMsg.value = '';
  try {
    const created = await apiClient.createGroupBuy(groupBuyForm);
    groupBuys.value.unshift(created);
    groupBuyForm.title = '';
    groupBuyForm.price = 39.9;
    groupBuyForm.groupSize = 3;
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '创建拼团活动失败';
  } finally {
    saving.value = false;
  }
}

async function saveCheckinRules() {
  saving.value = true;
  errorMsg.value = '';
  try {
    checkinRules.value = await apiClient.updateCheckinRules(checkinRules.value);
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '保存签到规则失败';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h3>营销活动</h3>
      <p>这里新增的优惠券和秒杀活动会同步出现在用户端首页。</p>
    </div>

    <div v-if="errorMsg" class="info-banner">{{ errorMsg }}</div>

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
      <div v-if="activeTab === 'coupons'" class="table-shell">
        <div class="section-header">
          <span>优惠券列表</span>
          <div class="inline-form">
            <input v-model="couponForm.title" class="field" placeholder="优惠券名称" />
            <input v-model="couponForm.threshold" class="field small" type="number" min="0" />
            <input v-model="couponForm.discount" class="field small" type="number" min="0" />
            <input v-model="couponForm.total" class="field small" type="number" min="1" />
            <button class="action-btn primary" :disabled="saving || !couponForm.title.trim()" @click="createCoupon">
              新建优惠券
            </button>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>名称</th><th>门槛</th><th>优惠</th><th>已领取</th><th>总量</th><th>状态</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in coupons" :key="item.id">
              <td>{{ item.title }}</td>
              <td>¥{{ item.threshold }}</td>
              <td class="price">¥{{ item.discount }}</td>
              <td>{{ item.used }}</td>
              <td>{{ item.total }}</td>
              <td><span :class="['tag', item.status === '进行中' ? 'tag-success' : 'tag-muted']">{{ item.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="activeTab === 'flash_sale'" class="table-shell">
        <div class="section-header">
          <span>秒杀活动列表</span>
          <div class="inline-form">
            <input v-model="flashSaleForm.title" class="field" placeholder="活动名称" />
            <select v-model="flashSaleForm.productId" class="field">
              <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
            </select>
            <input v-model="flashSaleForm.price" class="field small" type="number" min="0" />
            <input v-model="flashSaleForm.stock" class="field small" type="number" min="1" />
            <button class="action-btn primary" :disabled="saving || !flashSaleForm.productId" @click="createFlashSale">
              新建秒杀
            </button>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>活动名称</th><th>商品</th><th>秒杀价</th><th>库存</th><th>已售</th><th>状态</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in flashSales" :key="item.id">
              <td>{{ item.title }}</td>
              <td>{{ item.productName }}</td>
              <td class="price">¥{{ item.price }}</td>
              <td>{{ item.stock }}</td>
              <td>{{ item.sold }}</td>
              <td><span :class="['tag', item.status === '进行中' ? 'tag-success' : 'tag-muted']">{{ item.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="activeTab === 'group_buy'" class="table-shell">
        <div class="section-header">
          <span>拼团活动列表</span>
          <div class="inline-form">
            <input v-model="groupBuyForm.title" class="field" placeholder="活动名称" />
            <select v-model="groupBuyForm.productId" class="field">
              <option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
            </select>
            <input v-model="groupBuyForm.price" class="field small" type="number" min="0" />
            <input v-model="groupBuyForm.groupSize" class="field small" type="number" min="2" />
            <button class="action-btn primary" :disabled="saving || !groupBuyForm.productId" @click="createGroupBuy">
              新建拼团
            </button>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>活动名称</th><th>商品</th><th>拼团价</th><th>成团人数</th><th>已成团</th><th>状态</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in groupBuys" :key="item.id">
              <td>{{ item.title }}</td>
              <td>{{ item.productName }}</td>
              <td class="price">¥{{ item.price }}</td>
              <td>{{ item.groupSize }} 人</td>
              <td>{{ item.completed }}</td>
              <td><span :class="['tag', item.status === '进行中' ? 'tag-success' : 'tag-muted']">{{ item.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="activeTab === 'checkin'" class="table-shell">
        <div class="section-header">
          <span>签到奖励规则</span>
          <button class="action-btn primary" :disabled="saving" @click="saveCheckinRules">保存规则</button>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>连续天数</th><th>奖励</th><th>说明</th></tr>
          </thead>
          <tbody>
            <tr v-for="rule in checkinRules" :key="rule.day">
              <td>{{ rule.day }} 天</td>
              <td><input v-model="rule.reward" class="field" /></td>
              <td><input v-model="rule.desc" class="field" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
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
  background: #667eea;
  color: #ffffff;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid #eef2f7;
  color: #1f2937;
  font-weight: 600;
  font-size: 14px;
}

.inline-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.field {
  height: 34px;
  padding: 0 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}

.field.small {
  width: 96px;
}

.action-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.action-btn.primary {
  background: #667eea;
  color: #ffffff;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.info-banner {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 12px 16px;
  border-radius: 8px;
  color: #1e40af;
  font-size: 13px;
  margin-bottom: 16px;
}

.loading-text {
  padding: 40px;
  text-align: center;
  color: #64748b;
}

.price {
  color: #e6a23c;
  font-weight: 600;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.tag-success { background: #dcfce7; color: #166534; }
.tag-muted { background: #f3f4f6; color: #6b7280; }
</style>
