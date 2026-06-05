<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  apiClient,
  type FinanceSummary,
  type FinanceTransaction,
  type PlatformFeeSummary
} from '../../services/api';

const dateRange = ref<'today' | 'week' | 'month'>('today');
const loading = ref(true);
const errorMsg = ref('');
const summary = ref<FinanceSummary>({
  range: 'today',
  sales: 0,
  orders: 0,
  refunds: 0,
  profit: 0,
  totalRecharge: 0
});
const transactions = ref<FinanceTransaction[]>([]);
const platformFees = ref<PlatformFeeSummary>({
  wechatFee: 0,
  balanceFee: 0,
  totalRecharge: 0
});

async function loadFinanceData() {
  loading.value = true;
  errorMsg.value = '';

  try {
    const [summaryPayload, transactionsPayload, platformFeePayload] = await Promise.all([
      apiClient.getFinanceSummary(dateRange.value),
      apiClient.getFinanceTransactions(dateRange.value),
      apiClient.getPlatformFees()
    ]);

    summary.value = summaryPayload;
    transactions.value = transactionsPayload;
    platformFees.value = platformFeePayload;
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '加载财务数据失败';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadFinanceData();
});

watch(dateRange, () => {
  void loadFinanceData();
});

const summaryCards = computed(() => [
  { label: '销售额', value: `¥${summary.value.sales.toLocaleString()}` },
  { label: '订单数', value: summary.value.orders.toLocaleString() },
  { label: '退款金额', value: `¥${summary.value.refunds.toLocaleString()}`, className: 'text-red' },
  { label: '预计利润', value: `¥${summary.value.profit.toLocaleString()}`, className: 'text-green' },
  { label: '充值到账', value: `¥${summary.value.totalRecharge.toLocaleString()}` }
]);
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h3>财务对账</h3>
      <p>会员充值、余额支付和订单收款都来自同一套实时数据。</p>
    </div>

    <div v-if="errorMsg" class="info-banner">{{ errorMsg }}</div>

    <div class="tabs">
      <button :class="['tab-btn', { active: dateRange === 'today' }]" @click="dateRange = 'today'">今日</button>
      <button :class="['tab-btn', { active: dateRange === 'week' }]" @click="dateRange = 'week'">本周</button>
      <button :class="['tab-btn', { active: dateRange === 'month' }]" @click="dateRange = 'month'">本月</button>
    </div>

    <div v-if="loading" class="loading-text">加载中...</div>

    <template v-else>
      <section class="metrics-grid">
        <article v-for="item in summaryCards" :key="item.label" class="metric-card">
          <span>{{ item.label }}</span>
          <strong :class="item.className">{{ item.value }}</strong>
        </article>
      </section>

      <div class="table-shell">
        <div class="section-header">交易明细</div>
        <table class="data-table">
          <thead>
            <tr><th>类型</th><th>订单号</th><th>金额</th><th>支付方式</th><th>说明</th><th>时间</th></tr>
          </thead>
          <tbody>
            <tr v-for="tx in transactions" :key="tx.id">
              <td>
                <span :class="['tag', tx.type === '收款' ? 'tag-success' : tx.type === '充值' ? 'tag-info' : tx.type === '退款' ? 'tag-danger' : 'tag-muted']">
                  {{ tx.type }}
                </span>
              </td>
              <td>{{ tx.orderNo }}</td>
              <td :class="tx.amount < 0 ? 'text-red' : 'text-green'">
                {{ tx.amount < 0 ? `-¥${Math.abs(tx.amount).toFixed(2)}` : `¥${tx.amount.toFixed(2)}` }}
              </td>
              <td>{{ tx.method }}</td>
              <td>{{ tx.detail }}</td>
              <td class="text-muted">{{ tx.time }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-shell">
        <div class="section-header">平台费用汇总</div>
        <table class="data-table">
          <thead>
            <tr><th>项目</th><th>金额</th></tr>
          </thead>
          <tbody>
            <tr><td>微信支付手续费</td><td class="price">¥{{ platformFees.wechatFee.toFixed(2) }}</td></tr>
            <tr><td>余额支付手续费</td><td class="price">¥{{ platformFees.balanceFee.toFixed(2) }}</td></tr>
            <tr><td>累计充值到账</td><td class="price text-green">¥{{ platformFees.totalRecharge.toFixed(2) }}</td></tr>
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

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 18px;
  display: grid;
  gap: 10px;
}

.metric-card span { color: #5b6677; font-size: 13px; }
.metric-card strong { font-size: 22px; }

.loading-text {
  padding: 40px;
  text-align: center;
  color: #64748b;
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

.text-red { color: #dc2626; }
.text-green { color: #16a34a; }
.text-muted { color: #64748b; font-size: 13px; }

.section-header {
  padding: 14px 18px;
  border-bottom: 1px solid #eef2f7;
  color: #1f2937;
  font-weight: 600;
  font-size: 14px;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.tag-success { background: #dcfce7; color: #166534; }
.tag-danger { background: #fee2e2; color: #991b1b; }
.tag-info { background: #dbeafe; color: #1e40af; }
.tag-muted { background: #f3f4f6; color: #6b7280; }

.price { color: #e6a23c; font-weight: 600; }
</style>
