<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useDashboardStore } from '../../stores/dashboard';
import { useAuthStore } from '../../stores/auth';

const store = useDashboardStore();
const authStore = useAuthStore();
const loading = ref(true);
const errorMsg = ref('');

onMounted(async () => {
  try {
    await store.fetchSummary();
  } catch (e) {
    errorMsg.value = '加载仪表盘数据失败，请稍后刷新重试';
  } finally {
    loading.value = false;
  }
});

const metricCards = computed(() => [
  { label: '今日销售额', value: `¥${store.summary.todaySales.toLocaleString()}` },
  { label: '本月销售额', value: `¥${store.summary.monthlySales.toLocaleString()}` },
  { label: '订单数量', value: store.summary.orders.toLocaleString() },
  { label: '会员数量', value: store.summary.members.toLocaleString() },
  { label: '复购率', value: `${store.summary.repurchaseRate}%` },
  { label: '充值金额', value: `¥${store.summary.rechargeAmount.toLocaleString()}` }
]);
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h3>仪表盘</h3>
        <p>欢迎回来，{{ authStore.user?.nickname ?? '管理员' }}</p>
      </div>
    </div>

    <div v-if="errorMsg" class="info-banner">{{ errorMsg }}</div>

    <div v-if="loading" class="loading-text">加载中...</div>

    <section v-else class="metrics-grid">
      <article v-for="item in metricCards" :key="item.label" class="metric-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </section>

    <section class="panel-grid">
      <article class="panel">
        <header><h3>首版运营重点</h3></header>
        <ul class="quiet-list">
          <li>会员价与优惠券的组合运营，提升复购率</li>
          <li>首页楼层按拼团、秒杀、会员专区进行编排</li>
          <li>快递到家与自提核销双模式并行</li>
          <li>每日签到、积分商城提升用户活跃度</li>
        </ul>
      </article>

      <article class="panel">
        <header><h3>系统覆盖模块</h3></header>
        <div class="tag-list">
          <span>商品</span><span>会员</span><span>订单</span>
          <span>优惠券</span><span>拼团</span><span>秒杀</span>
          <span>签到</span><span>CMS</span><span>自提点</span>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
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
}
</style>
