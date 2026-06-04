import { defineStore } from 'pinia';
import { apiClient, type DashboardSummary } from '../services/api';

const emptySummary: DashboardSummary = {
  todaySales: 0,
  monthlySales: 0,
  orders: 0,
  members: 0,
  repurchaseRate: 0,
  rechargeAmount: 0
};

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    summary: emptySummary
  }),
  actions: {
    async fetchSummary() {
      this.summary = await apiClient.getDashboardSummary();
    }
  }
});
