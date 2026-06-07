import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import ShellLayout from '../shell/ShellLayout.vue';
import LoginView from '../views/auth/LoginView.vue';
import QuickFeaturesView from '../views/quick/QuickFeaturesView.vue';
import DashboardView from '../views/dashboard/DashboardView.vue';
import ProductListView from '../views/products/ProductListView.vue';
import MemberListView from '../views/members/MemberListView.vue';
import OrderListView from '../views/orders/OrderListView.vue';
import MarketingView from '../views/marketing/MarketingView.vue';
import FinanceView from '../views/finance/FinanceView.vue';
import NotificationView from '../views/notifications/NotificationView.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guest: true }
    },
    {
      path: '/',
      component: ShellLayout,
      redirect: '/quick',
      meta: { requiresAuth: true },
      children: [
        { path: '/quick', component: QuickFeaturesView },
        { path: '/dashboard', component: DashboardView },
        { path: '/products', component: ProductListView },
        { path: '/orders', component: OrderListView },
        { path: '/members', component: MemberListView },
        { path: '/marketing', component: MarketingView },
        { path: '/finance', component: FinanceView },
        { path: '/notifications', component: NotificationView }
      ]
    }
  ]
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  if (authStore.isAuthenticated && !authStore.isAdmin) {
    authStore.logout();
    next({ name: 'login' });
    return;
  }

  if (to.meta.requiresAuth && (!authStore.isAuthenticated || !authStore.isAdmin)) {
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else if (to.meta.guest && authStore.isAuthenticated && authStore.isAdmin) {
    next({ path: '/' });
  } else {
    next();
  }
});

export default router;
