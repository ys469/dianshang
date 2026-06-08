<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const quickActions = [
  { icon: '📦', label: '商品管理', desc: '新增、改价、上下架与库存维护', path: '/products' },
  { icon: '📋', label: '订单中心', desc: '查看收货信息并处理发货与完成', path: '/orders' },
  { icon: '👥', label: '会员管理', desc: '调整等级、余额、积分与优惠券', path: '/members' },
  { icon: '🎯', label: '营销活动', desc: '管理优惠券、秒杀、拼团与签到', path: '/marketing' },
  { icon: '💰', label: '财务对账', desc: '查看销售额、充值与交易流水', path: '/finance' },
  { icon: '🔔', label: '消息通知', desc: '跟进订单、发货与系统消息', path: '/notifications' }
];
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h3>运营工作台</h3>
      <p>从这里直接进入日常运营、履约和营销管理页面。</p>
    </div>

    <section class="quick-grid">
      <article
        v-for="action in quickActions"
        :key="action.label"
        class="quick-card"
        @click="router.push(action.path)"
      >
        <span class="quick-icon">{{ action.icon }}</span>
        <div class="quick-copy">
          <strong>{{ action.label }}</strong>
          <span>{{ action.desc }}</span>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.quick-card {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 18px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.quick-card:hover {
  transform: translateY(-1px);
  border-color: rgba(124, 77, 255, 0.28);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.quick-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: rgba(124, 77, 255, 0.08);
  font-size: 26px;
}

.quick-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.quick-copy strong {
  color: #111827;
  font-size: 16px;
}

.quick-copy span {
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 960px) {
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .quick-grid {
    grid-template-columns: 1fr;
  }

  .quick-card {
    grid-template-columns: 44px minmax(0, 1fr);
    padding: 16px;
  }

  .quick-icon {
    width: 44px;
    height: 44px;
    font-size: 22px;
  }
}
</style>
