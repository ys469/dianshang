import { createRouter, createWebHistory } from 'vue-router';
import ShellLayout from '../shell/ShellLayout.vue';
import DashboardView from '../views/dashboard/DashboardView.vue';
import MemberListView from '../views/members/MemberListView.vue';
import OrderListView from '../views/orders/OrderListView.vue';
import ProductListView from '../views/products/ProductListView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: ShellLayout,
      redirect: '/dashboard',
      children: [
        { path: '/dashboard', component: DashboardView },
        { path: '/products', component: ProductListView },
        { path: '/orders', component: OrderListView },
        { path: '/members', component: MemberListView }
      ]
    }
  ]
});

export default router;
