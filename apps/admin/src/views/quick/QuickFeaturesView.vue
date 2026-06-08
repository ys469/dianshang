<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const quickActions = [
  { icon: '📦', label: '商品管理', desc: '查看和管理所有商品', path: '/products' },
  { icon: '📋', label: '订单管理', desc: '处理待付款和待发货订单', path: '/orders' },
  { icon: '👥', label: '会员管理', desc: '管理会员等级和优惠券', path: '/members' },
  { icon: '🎯', label: '营销活动', desc: '配置优惠券和秒杀活动', path: '/marketing' },
  { icon: '💰', label: '财务对账', desc: '查看收入汇总和交易明细', path: '/finance' },
  { icon: '🔔', label: '消息通知', desc: '查看系统通知和预警', path: '/notifications' }
];

const systemStatus = [
  { label: 'API 服务', status: 'running', text: '运行中' },
  { label: '数据库', status: 'running', text: 'SQLite' },
  { label: 'JWT 认证', status: 'running', text: '已启用' },
  { label: '管理员账号', status: 'running', text: authStore.user?.nickname ?? 'admin' }
];
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h3>快捷功能</h3>
      <p>常用功能入口和系统状态一览</p>
    </div>

    <!-- 快捷操作 -->
    <section>
      <h4 class="section-title">快捷操作</h4>
      <div class="quick-grid">
        <article
          v-for="action in quickActions"
          :key="action.label"
          class="quick-card"
          @click="router.push(action.path)"
        >
          <span class="quick-icon">{{ action.icon }}</span>
          <div>
            <span class="quick-label">{{ action.label }}</span>
            <span class="quick-desc">{{ action.desc }}</span>
          </div>
        </article>
      </div>
    </section>

    <!-- 用户端登录隔离 -->
    <section style="margin-top: 24px">
      <h4 class="section-title">用户端登录隔离</h4>
      <div class="info-panel">
        <p>管理员和会员使用 <strong>独立的认证通道</strong>：</p>
        <ul>
          <li>管理员通过 <code>POST /auth/login</code> 使用 <strong>role=admin</strong> 登录</li>
          <li>会员通过 <code>POST /auth/login</code> 使用 <strong>role=user</strong> 登录</li>
          <li>管理员接口需要 <strong>JWT + admin 角色</strong> 双重验证</li>
          <li>会员无法访问管理员接口（返回 403）</li>
        </ul>
      </div>
    </section>

    <!-- 系统状态 -->
    <section style="margin-top: 24px">
      <h4 class="section-title">系统状态</h4>
      <div class="status-grid">
        <div v-for="s in systemStatus" :key="s.label" class="status-item">
          <span class="status-dot"></span>
          <span class="status-label">{{ s.label }}</span>
          <span class="status-text">{{ s.text }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 14px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.quick-card {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px;
  background: #ffffff;
  border-radius: 10px;
  cursor: pointer;
  transition: box-shadow 0.2s;
  border: 1px solid #e5e7eb;
}

.quick-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #667eea;
}

.quick-icon {
  font-size: 28px;
  flex-shrink: 0;
  width: 44px;
  text-align: center;
}

.quick-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.quick-desc {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-top: 3px;
}

.info-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 18px;
  font-size: 13px;
  color: #374151;
  line-height: 1.8;
}

.info-panel ul {
  margin: 8px 0 0;
  padding-left: 20px;
}

.info-panel code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
}

.status-label {
  font-size: 13px;
  color: #374151;
}

.status-text {
  font-size: 13px;
  color: #64748b;
  margin-left: auto;
}

@media (max-width: 960px) {
  .quick-grid,
  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .quick-card {
    align-items: flex-start;
    padding: 16px;
  }

  .quick-icon {
    width: 36px;
    font-size: 24px;
  }
}
</style>
