<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

function handleLogout() {
  authStore.logout();
  router.replace('/login');
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">SM</div>
        <div>
          <h1>智能会员商城</h1>
          <p>运营后台</p>
        </div>
      </div>
      <nav class="nav">
        <RouterLink to="/quick">⚡ 快捷功能</RouterLink>
        <div class="nav-divider"></div>
        <RouterLink to="/products">📦 商品管理</RouterLink>
        <RouterLink to="/orders">📋 订单管理</RouterLink>
        <RouterLink to="/members">👥 会员管理</RouterLink>
        <RouterLink to="/marketing">🎯 营销活动</RouterLink>
        <div class="nav-divider"></div>
        <RouterLink to="/finance">💰 财务对账</RouterLink>
        <RouterLink to="/notifications">🔔 消息通知</RouterLink>
      </nav>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <h2>高端会员商城运营中心</h2>
          <p>面向社区团购与会员超市的一体化运营面板</p>
        </div>
        <div class="topbar-right">
          <span class="user-info">
            <span v-if="authStore.isAdmin" class="role-badge admin-badge">管理员</span>
            <span v-else class="role-badge member-badge">会员</span>
            <span class="user-name">{{ authStore.user?.nickname ?? '--' }}</span>
          </span>
          <button class="logout-btn" @click="handleLogout">退出登录</button>
        </div>
      </header>

      <section class="content">
        <RouterView />
      </section>
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}

.sidebar {
  background: #1e293b;
  color: #e2e8f0;
  padding: 24px 0;
  display: flex;
  flex-direction: column;
}

.brand {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 0 20px 24px;
  border-bottom: 1px solid #334155;
  margin-bottom: 16px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.brand h1 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 2px;
}

.brand p {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
}

.nav a {
  display: block;
  padding: 10px 14px;
  border-radius: 8px;
  color: #cbd5e1;
  text-decoration: none;
  font-size: 14px;
  transition: background 0.2s;
}

.nav a:hover {
  background: #334155;
  color: #ffffff;
}

.nav a.router-link-exact-active {
  background: #667eea;
  color: #ffffff;
}

.nav-divider {
  height: 1px;
  background: #334155;
  margin: 6px 14px;
}

.main {
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 28px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.topbar h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 2px;
  color: #1f2937;
}

.topbar p {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.admin-badge { background: #fee2e2; color: #991b1b; }
.member-badge { background: #dcfce7; color: #166534; }

.logout-btn {
  padding: 6px 14px;
  border: 1px solid #fca5a5;
  background: #ffffff;
  color: #dc2626;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.logout-btn:hover { background: #fef2f2; }

.content {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
}
</style>
