<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const menuOpen = ref(false);

function closeMenu() {
  menuOpen.value = false;
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function handleLogout() {
  closeMenu();
  authStore.logout();
  router.replace('/login');
}

watch(
  () => route.fullPath,
  () => {
    closeMenu();
  }
);
</script>

<template>
  <div class="shell">
    <Transition name="mask-fade">
      <button
        v-if="menuOpen"
        class="sidebar-mask"
        type="button"
        aria-label="关闭菜单"
        @click="closeMenu"
      ></button>
    </Transition>

    <aside :class="['sidebar', { open: menuOpen }]">
      <div class="brand">
        <div class="brand-mark">SM</div>
        <div>
          <h1>智能会员商城</h1>
          <p>运营后台</p>
        </div>
        <button class="sidebar-close" type="button" aria-label="关闭侧边栏" @click="closeMenu">
          ×
        </button>
      </div>
      <nav class="nav">
        <RouterLink to="/quick" @click="closeMenu">运营工作台</RouterLink>
        <div class="nav-divider"></div>
        <RouterLink to="/products" @click="closeMenu">商品管理</RouterLink>
        <RouterLink to="/orders" @click="closeMenu">订单管理</RouterLink>
        <RouterLink to="/members" @click="closeMenu">会员管理</RouterLink>
        <RouterLink to="/marketing" @click="closeMenu">营销活动</RouterLink>
        <div class="nav-divider"></div>
        <RouterLink to="/finance" @click="closeMenu">财务对账</RouterLink>
        <RouterLink to="/notifications" @click="closeMenu">消息通知</RouterLink>
      </nav>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="topbar-left">
          <button class="menu-toggle" type="button" aria-label="打开菜单" @click="toggleMenu">
            ☰
          </button>
          <div class="topbar-copy">
            <h2>智能会员商城运营中心</h2>
            <p>面向社区团购与会员超市的一体化运营面板</p>
          </div>
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
  position: relative;
}

.sidebar {
  background: #1e293b;
  color: #e2e8f0;
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  transition: transform 0.24s ease, box-shadow 0.24s ease;
  z-index: 30;
}

.brand {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 0 20px 24px;
  border-bottom: 1px solid #334155;
  margin-bottom: 16px;
  position: relative;
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

.menu-toggle,
.sidebar-close {
  display: none;
}

.menu-toggle,
.sidebar-close,
.sidebar-mask {
  border: 0;
  cursor: pointer;
}

.sidebar-close {
  margin-left: auto;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.12);
  color: #ffffff;
  font-size: 24px;
  line-height: 1;
}

.sidebar-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.52);
  z-index: 20;
}

.mask-fade-enter-active,
.mask-fade-leave-active {
  transition: opacity 0.2s ease;
}

.mask-fade-enter-from,
.mask-fade-leave-to {
  opacity: 0;
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
  min-width: 0;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 28px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.topbar-left {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.topbar-copy {
  min-width: 0;
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
  flex-shrink: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.user-name {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.admin-badge {
  background: #fee2e2;
  color: #991b1b;
}

.member-badge {
  background: #dcfce7;
  color: #166534;
}

.logout-btn {
  padding: 6px 14px;
  border: 1px solid #fca5a5;
  background: #ffffff;
  color: #dc2626;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.logout-btn:hover {
  background: #fef2f2;
}

.content {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
}

@media (max-width: 960px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(82vw, 300px);
    padding-top: 20px;
    overflow-y: auto;
    transform: translateX(-100%);
    box-shadow: none;
  }

  .sidebar.open {
    transform: translateX(0);
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.3);
  }

  .menu-toggle,
  .sidebar-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .menu-toggle {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: #eef2ff;
    color: #4338ca;
    font-size: 22px;
    flex-shrink: 0;
  }

  .topbar {
    padding: 14px 16px;
    gap: 12px;
    flex-wrap: wrap;
  }

  .topbar h2 {
    font-size: 16px;
  }

  .topbar p {
    font-size: 12px;
    line-height: 1.5;
  }

  .topbar-right {
    width: 100%;
    justify-content: space-between;
    gap: 12px;
  }

  .content {
    padding: 16px;
  }
}
</style>
