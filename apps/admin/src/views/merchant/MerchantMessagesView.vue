<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  apiClient,
  type MerchantThreadDetail,
  type MerchantThreadItem
} from '../../services/api';

const threads = ref<MerchantThreadItem[]>([]);
const selectedThreadId = ref('');
const selectedThread = ref<MerchantThreadDetail | null>(null);
const searchKeyword = ref('');
const loading = ref(true);
const detailLoading = ref(false);
const replying = ref(false);
const replyDraft = ref('');
const errorMsg = ref('');
const successMsg = ref('');

function sortThreads(list: MerchantThreadItem[]) {
  return [...list].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

function replaceThread(next: MerchantThreadItem) {
  const existing = threads.value.filter((item) => item.threadId !== next.threadId);
  threads.value = sortThreads([next, ...existing]);
}

async function loadThreads() {
  const result = await apiClient.getMerchantMessageThreads();
  threads.value = sortThreads(result);

  if (!selectedThreadId.value && threads.value.length) {
    await openThread(threads.value[0].threadId);
  }
}

async function openThread(threadId: string) {
  selectedThreadId.value = threadId;
  detailLoading.value = true;
  errorMsg.value = '';

  try {
    const detail = await apiClient.getMerchantMessageThread(threadId);
    selectedThread.value = detail;
    replaceThread(detail);
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '加载商家消息失败。';
  } finally {
    detailLoading.value = false;
  }
}

async function handleReply() {
  if (!selectedThread.value || replying.value) {
    return;
  }

  const message = replyDraft.value.trim();
  if (!message) {
    errorMsg.value = '请输入回复内容。';
    successMsg.value = '';
    return;
  }

  replying.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const detail = await apiClient.replyMerchantMessage(selectedThread.value.threadId, message);
    selectedThread.value = detail;
    replaceThread(detail);
    replyDraft.value = '';
    successMsg.value = '已回复会员，前台联系商家会话会同步更新。';
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '回复会员失败。';
  } finally {
    replying.value = false;
  }
}

const filteredThreads = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return threads.value;
  }

  return threads.value.filter((thread) => {
    const haystack = [
      thread.memberNickname,
      thread.memberMobile,
      thread.lastMessagePreview
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(keyword);
  });
});

const summaryCards = computed(() => [
  { label: '会话总数', value: `${threads.value.length}` },
  {
    label: '待回复消息',
    value: `${threads.value.reduce((sum, thread) => sum + thread.adminUnreadCount, 0)}`
  },
  {
    label: '待会员查看',
    value: `${threads.value.reduce((sum, thread) => sum + thread.memberUnreadCount, 0)}`
  },
  {
    label: '今日活跃会话',
    value: `${
      threads.value.filter((thread) => {
        const updated = new Date(thread.updatedAt);
        const now = new Date();
        return (
          updated.getFullYear() === now.getFullYear() &&
          updated.getMonth() === now.getMonth() &&
          updated.getDate() === now.getDate()
        );
      }).length
    }`
  }
]);

function formatDateTime(value: string | null) {
  if (!value) {
    return '--';
  }

  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

onMounted(async () => {
  try {
    await loadThreads();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '加载商家消息失败。';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h3>商家消息</h3>
        <p>会员从前台“联系商家”入口发来的消息会在这里汇总，管理员可直接回复会员。</p>
      </div>
    </div>

    <div v-if="errorMsg" class="info-banner error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="info-banner success">{{ successMsg }}</div>

    <section class="stats-grid">
      <article v-for="item in summaryCards" :key="item.label" class="stat-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </section>

    <div class="filter-bar">
      <input
        v-model="searchKeyword"
        class="search-box"
        type="text"
        placeholder="搜索会员昵称、手机号或最近一条消息..."
      />
    </div>

    <div v-if="loading" class="loading-text">加载中...</div>

    <section v-else class="message-grid">
      <div class="thread-list">
        <button
          v-for="thread in filteredThreads"
          :key="thread.threadId"
          type="button"
          :class="['thread-card', { active: selectedThreadId === thread.threadId }]"
          @click="openThread(thread.threadId)"
        >
          <div class="thread-head">
            <strong>{{ thread.memberNickname }}</strong>
            <span class="thread-time">{{ formatDateTime(thread.updatedAt) }}</span>
          </div>
          <p class="thread-mobile">{{ thread.memberMobile }}</p>
          <p class="thread-preview">{{ thread.lastMessagePreview || '暂无消息内容' }}</p>
          <div class="thread-meta">
            <span>总消息 {{ thread.messageCount }}</span>
            <span v-if="thread.adminUnreadCount" class="badge warn">待回复 {{ thread.adminUnreadCount }}</span>
            <span v-if="thread.memberUnreadCount" class="badge">待查看 {{ thread.memberUnreadCount }}</span>
          </div>
        </button>

        <div v-if="!filteredThreads.length" class="empty-state">
          <h4>还没有商家消息</h4>
          <p>会员从前台联系商家后，这里会自动出现对应会话。</p>
        </div>
      </div>

      <div class="detail-shell">
        <div v-if="detailLoading" class="loading-text compact">正在加载会话...</div>

        <template v-else-if="selectedThread">
          <article class="detail-card">
            <div class="detail-head">
              <div>
                <h4>{{ selectedThread.memberNickname }}</h4>
                <p>{{ selectedThread.memberMobile }}</p>
              </div>
              <div class="detail-tags">
                <span class="badge">会员消息 {{ selectedThread.messageCount }}</span>
                <span class="badge warn" v-if="selectedThread.adminUnreadCount">
                  待回复 {{ selectedThread.adminUnreadCount }}
                </span>
              </div>
            </div>

            <div class="conversation-list">
              <article
                v-for="message in selectedThread.messages"
                :key="message.id"
                :class="['message-card', message.senderRole === 'admin' ? 'reply-card' : 'member-card']"
              >
                <div class="message-meta">
                  <strong>{{ message.senderRole === 'admin' ? '管理员' : message.senderName }}</strong>
                  <span>{{ formatDateTime(message.createdAt) }}</span>
                </div>
                <p>{{ message.content }}</p>
              </article>
            </div>
          </article>

          <article class="reply-panel">
            <div class="reply-head">
              <h4>回复会员</h4>
              <span>发送后前台联系商家页面会立即同步</span>
            </div>
            <textarea
              v-model="replyDraft"
              class="reply-input"
              rows="5"
              placeholder="输入给会员的回复内容，例如库存确认、发货时间或售后处理进度。"
            />
            <div class="reply-actions">
              <button class="ghost-btn" type="button" @click="replyDraft = ''">清空</button>
              <button class="primary-btn" type="button" :disabled="replying" @click="handleReply">
                {{ replying ? '发送中...' : '发送回复' }}
              </button>
            </div>
          </article>
        </template>

        <div v-else class="empty-state detail-empty">
          <h4>请选择一个会话</h4>
          <p>左侧会显示所有来自会员前台联系商家的消息线程。</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat-card,
.thread-card,
.detail-card,
.reply-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.stat-card {
  padding: 18px;
  display: grid;
  gap: 8px;
}

.stat-card span {
  font-size: 13px;
  color: #64748b;
}

.stat-card strong {
  font-size: 24px;
  color: #111827;
}

.filter-bar {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
}

.search-box,
.reply-input {
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.search-box:focus,
.reply-input:focus {
  border-color: #7c4dff;
}

.message-grid {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.thread-list,
.detail-shell,
.conversation-list {
  display: grid;
  gap: 12px;
}

.thread-card {
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.thread-card.active {
  border-color: rgba(124, 77, 255, 0.4);
  box-shadow: 0 10px 24px rgba(124, 77, 255, 0.1);
}

.thread-card:hover {
  transform: translateY(-1px);
}

.thread-head,
.thread-meta,
.detail-head,
.detail-tags,
.message-meta,
.reply-actions,
.reply-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.thread-head strong,
.detail-head h4,
.reply-head h4 {
  color: #111827;
}

.thread-time,
.thread-mobile,
.thread-preview,
.thread-meta span,
.detail-head p,
.reply-head span,
.message-meta span {
  color: #64748b;
  font-size: 13px;
}

.thread-preview {
  margin: 8px 0 0;
  line-height: 1.6;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(124, 77, 255, 0.08);
  color: #5b21b6;
  font-size: 12px;
  font-weight: 600;
}

.badge.warn {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.detail-card,
.reply-panel {
  padding: 16px;
  display: grid;
  gap: 14px;
}

.conversation-list {
  max-height: 520px;
  overflow-y: auto;
  padding-right: 4px;
}

.message-card {
  padding: 14px;
  border-radius: 10px;
}

.member-card {
  background: #f8fafc;
}

.reply-card {
  background: #f7f5ff;
}

.message-card p {
  margin: 8px 0 0;
  color: #1f2937;
  line-height: 1.65;
}

.reply-input {
  resize: vertical;
}

.ghost-btn,
.primary-btn,
.thread-card {
  border: none;
}

.ghost-btn,
.primary-btn {
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}

.ghost-btn {
  background: #ffffff;
  border: 1px solid #d1d5db;
  color: #374151;
}

.primary-btn {
  background: #7c4dff;
  color: #ffffff;
}

.primary-btn:disabled {
  opacity: 0.72;
  cursor: wait;
}

.loading-text,
.empty-state {
  padding: 28px;
  text-align: center;
  color: #64748b;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.loading-text.compact,
.detail-empty {
  min-height: 220px;
  display: grid;
  place-items: center;
}

@media (max-width: 1100px) {
  .message-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .thread-head,
  .thread-meta,
  .detail-head,
  .detail-tags,
  .message-meta,
  .reply-actions,
  .reply-head {
    flex-wrap: wrap;
  }
}
</style>
