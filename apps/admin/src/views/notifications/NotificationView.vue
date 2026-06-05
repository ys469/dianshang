<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiClient, type NotificationItem } from '../../services/api';

const filter = ref<'all' | 'unread'>('all');
const notifications = ref<NotificationItem[]>([]);
const loading = ref(true);
const errorMsg = ref('');

async function loadNotifications() {
  notifications.value = await apiClient.getNotifications();
}

onMounted(async () => {
  try {
    await loadNotifications();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '加载通知失败';
  } finally {
    loading.value = false;
  }
});

const filteredNotifications = computed(() => {
  return filter.value === 'unread'
    ? notifications.value.filter((item) => !item.read)
    : notifications.value;
});

const unreadCount = computed(() => notifications.value.filter((item) => !item.read).length);

function markAllRead() {
  notifications.value = notifications.value.map((item) => ({
    ...item,
    read: true
  }));
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    order: '📦',
    alert: '⚠️',
    payment: '💰',
    refund: '↩️',
    recharge: '💳',
    system: '🔔'
  };
  return icons[type] ?? '📌';
}

function getTypeClass(type: string): string {
  const classes: Record<string, string> = {
    order: 'type-order',
    alert: 'type-alert',
    payment: 'type-payment',
    refund: 'type-refund',
    recharge: 'type-recharge',
    system: 'type-system'
  };
  return classes[type] ?? '';
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h3>消息通知</h3>
        <p>{{ unreadCount }} 条未读消息，订单、充值和库存预警会自动出现在这里。</p>
      </div>
      <button class="mark-read-btn" @click="markAllRead">全部标为已读</button>
    </div>

    <div v-if="errorMsg" class="info-banner">{{ errorMsg }}</div>

    <div class="tabs">
      <button :class="['tab-btn', { active: filter === 'all' }]" @click="filter = 'all'">
        全部 ({{ notifications.length }})
      </button>
      <button :class="['tab-btn', { active: filter === 'unread' }]" @click="filter = 'unread'">
        未读 ({{ unreadCount }})
      </button>
    </div>

    <div v-if="loading" class="loading-text">加载中...</div>

    <div v-else class="notification-list">
      <article
        v-for="item in filteredNotifications"
        :key="item.id"
        :class="['notification-item', { unread: !item.read }]"
      >
        <span :class="['type-icon', getTypeClass(item.type)]">{{ getTypeIcon(item.type) }}</span>
        <div class="notification-body">
          <div class="notification-header">
            <span class="notification-title">{{ item.title }}</span>
            <span class="notification-time">{{ item.time }}</span>
          </div>
          <p class="notification-content">{{ item.content }}</p>
        </div>
        <span v-if="!item.read" class="unread-dot"></span>
      </article>
    </div>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: #ffffff;
  padding: 8px;
  border-radius: 8px;
}

.tab-btn {
  padding: 8px 20px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  color: #64748b;
}

.tab-btn.active {
  background: #667eea;
  color: #ffffff;
}

.mark-read-btn {
  padding: 6px 14px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  color: #374151;
}

.info-banner {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 12px 16px;
  border-radius: 8px;
  color: #1e40af;
  font-size: 13px;
  margin-bottom: 16px;
}

.loading-text {
  padding: 40px;
  text-align: center;
  color: #64748b;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notification-item {
  display: flex;
  gap: 14px;
  padding: 16px 18px;
  background: #ffffff;
  border-radius: 8px;
  align-items: flex-start;
}

.notification-item.unread {
  background: #f8f7ff;
  border-left: 3px solid #667eea;
}

.type-icon {
  font-size: 20px;
  flex-shrink: 0;
  width: 36px;
  text-align: center;
}

.notification-body {
  flex: 1;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.notification-title {
  font-weight: 600;
  font-size: 14px;
  color: #1f2937;
}

.notification-time {
  font-size: 12px;
  color: #9ca3af;
}

.notification-content {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #667eea;
  flex-shrink: 0;
  margin-top: 6px;
}
</style>
