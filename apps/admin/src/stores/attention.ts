import { defineStore } from 'pinia';
import { apiClient } from '../services/api';
import {
  buildAdminAttentionSnapshot,
  detectAdminAttentionIncrease,
  type AdminAttentionSnapshot
} from '../utils/admin-attention';
import {
  installAdminAttentionSoundUnlock,
  playAdminAttentionSound
} from '../utils/admin-attention-sound';

type RefreshOptions = {
  playSound?: boolean;
};

export const useAttentionStore = defineStore('attention', {
  state: () => ({
    pendingOrderCount: 0,
    unreadMerchantMessageCount: 0,
    isHydrated: false,
    lastError: '',
    pollTimer: null as number | null
  }),

  getters: {
    hasPendingOrders: (state) => state.pendingOrderCount > 0,
    hasUnreadMerchantMessages: (state) => state.unreadMerchantMessageCount > 0
  },

  actions: {
    async refresh(options: RefreshOptions = {}) {
      try {
        const [orders, merchantThreads] = await Promise.all([
          apiClient.getOrders(),
          apiClient.getMerchantMessageThreads()
        ]);

        const nextSnapshot = buildAdminAttentionSnapshot(orders, merchantThreads);
        const previousSnapshot: AdminAttentionSnapshot | null = this.isHydrated
          ? {
              pendingOrderCount: this.pendingOrderCount,
              unreadMerchantMessageCount: this.unreadMerchantMessageCount
            }
          : null;

        const increase = detectAdminAttentionIncrease(previousSnapshot, nextSnapshot);

        this.pendingOrderCount = nextSnapshot.pendingOrderCount;
        this.unreadMerchantMessageCount = nextSnapshot.unreadMerchantMessageCount;
        this.isHydrated = true;
        this.lastError = '';

        if (options.playSound !== false && increase.shouldPlaySound) {
          installAdminAttentionSoundUnlock();
          void playAdminAttentionSound(increase);
        }

        return nextSnapshot;
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : '后台提醒加载失败';
        return null;
      }
    },

    startPolling(intervalMs = 5000) {
      if (this.pollTimer) {
        return;
      }

      installAdminAttentionSoundUnlock();
      void this.refresh({ playSound: false });

      this.pollTimer = window.setInterval(() => {
        void this.refresh();
      }, intervalMs);
    },

    stopPolling() {
      if (this.pollTimer) {
        window.clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    },

    reset() {
      this.stopPolling();
      this.pendingOrderCount = 0;
      this.unreadMerchantMessageCount = 0;
      this.isHydrated = false;
      this.lastError = '';
    }
  }
});
