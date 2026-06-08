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
  } catch {
    errorMsg.value = '加载仪表盘数据失败，请稍后刷新重试。';
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

const operationalBoards = computed(() => [
  {
    title: '履约处理',
    points: ['查看待发货订单', '核对收货地址与手机号', '补录物流公司和运单号']
  },
  {
    title: '会员运营',
    points: ['调整会员等级与成长值', '处理储值、积分和优惠券发放', '查看复购与消费趋势']
  },
  {
    title: '营销执行',
    points: ['管理秒杀、拼团与签到', '上线不同门槛优惠券', '同步前台活动展示价格']
  },
  {
    title: '财务核对',
    points: ['检查销售额与充值到账', '查看支付方式分布', '对照退款与流水记录']
  }
]);
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h3>经营看板</h3>
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

    <section class="board-grid">
      <article v-for="board in operationalBoards" :key="board.title" class="board-card">
        <h4>{{ board.title }}</h4>
        <ul>
          <li v-for="point in board.points" :key="point">{{ point }}</li>
        </ul>
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

.board-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.board-card {
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.board-card h4 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #111827;
}

.board-card ul {
  margin: 0;
  padding-left: 18px;
  color: #475467;
  display: grid;
  gap: 10px;
  font-size: 14px;
  line-height: 1.6;
}

@media (max-width: 960px) {
  .board-grid {
    grid-template-columns: 1fr;
  }
}
</style>
