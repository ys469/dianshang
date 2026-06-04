<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useDashboardStore } from '../../stores/dashboard';

const store = useDashboardStore();

onMounted(() => {
  void store.fetchSummary();
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
    <section class="metrics-grid">
      <article v-for="item in metricCards" :key="item.label" class="metric-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </section>

    <section class="panel-grid">
      <article class="panel">
        <header>
          <h3>首版运营重点</h3>
        </header>
        <ul class="quiet-list">
          <li>会员价与优惠券的组合运营</li>
          <li>首页楼层按拼团、秒杀、会员专区进行编排</li>
          <li>快递到家与自提核销双模式并行</li>
        </ul>
      </article>
      <article class="panel">
        <header>
          <h3>系统覆盖模块</h3>
        </header>
        <div class="tag-list">
          <span>商品</span>
          <span>会员</span>
          <span>订单</span>
          <span>优惠券</span>
          <span>拼团</span>
          <span>秒杀</span>
          <span>签到</span>
          <span>CMS</span>
        </div>
      </article>
    </section>
  </div>
</template>
