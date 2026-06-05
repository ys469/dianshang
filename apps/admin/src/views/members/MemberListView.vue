<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiClient, type AdminMember } from '../../services/api';

const members = ref<AdminMember[]>([]);
const loading = ref(true);
const savingMemberId = ref('');
const errorMsg = ref('');
const searchKeyword = ref('');
const levelFilter = ref<'all' | '黄金会员' | '钻石会员'>('all');

async function loadMembers() {
  members.value = await apiClient.getMembers();
}

onMounted(async () => {
  try {
    await loadMembers();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '加载会员数据失败';
  } finally {
    loading.value = false;
  }
});

const filteredMembers = computed(() => {
  let list = members.value;

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    list = list.filter(
      (member) =>
        member.nickname.toLowerCase().includes(keyword) ||
        member.mobile.includes(keyword)
    );
  }

  if (levelFilter.value !== 'all') {
    list = list.filter((member) => member.memberLevel === levelFilter.value);
  }

  return list;
});

function getLevelClass(level: string): string {
  if (level.includes('钻石') || level.includes('至尊')) return 'level-vip';
  if (level.includes('黄金') || level.includes('铂金')) return 'level-gold';
  return 'level-normal';
}

async function patchMember(
  member: AdminMember,
  payload: {
    memberLevel?: string;
    balanceDelta?: number;
    pointsDelta?: number;
    growthDelta?: number;
    couponsDelta?: number;
  }
) {
  savingMemberId.value = member.id;
  errorMsg.value = '';

  try {
    const updated = await apiClient.updateMember(member.id, payload);
    const target = members.value.find((item) => item.id === member.id);
    if (target) {
      Object.assign(target, updated);
    }
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '会员更新失败';
  } finally {
    savingMemberId.value = '';
  }
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h3>会员管理</h3>
        <p>会员注册、订单、充值和后台调账会统一回写到这里。</p>
      </div>
    </div>

    <div v-if="errorMsg" class="info-banner">{{ errorMsg }}</div>

    <div class="filter-bar">
      <input
        v-model="searchKeyword"
        class="search-box"
        placeholder="搜索昵称或手机号..."
        type="text"
      />
      <div class="filter-tabs">
        <button :class="{ active: levelFilter === 'all' }" @click="levelFilter = 'all'">全部</button>
        <button :class="{ active: levelFilter === '黄金会员' }" @click="levelFilter = '黄金会员'">黄金会员</button>
        <button :class="{ active: levelFilter === '钻石会员' }" @click="levelFilter = '钻石会员'">钻石会员</button>
      </div>
    </div>

    <div v-if="loading" class="loading-text">加载中...</div>

    <div v-else class="table-shell">
      <table class="data-table">
        <thead>
          <tr>
            <th>昵称</th>
            <th>手机号</th>
            <th>会员等级</th>
            <th>余额</th>
            <th>积分</th>
            <th>优惠券</th>
            <th>累计订单</th>
            <th>累计消费</th>
            <th>最近下单</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in filteredMembers" :key="member.id">
            <td>{{ member.nickname }}</td>
            <td>{{ member.mobile }}</td>
            <td>
              <span :class="['level-tag', getLevelClass(member.memberLevel)]">
                {{ member.memberLevel }}
              </span>
            </td>
            <td><strong>¥{{ member.balance.toFixed(2) }}</strong></td>
            <td>{{ member.points }}</td>
            <td>{{ member.coupons }}</td>
            <td>{{ member.totalOrders }}</td>
            <td><strong>¥{{ member.totalSpent.toFixed(2) }}</strong></td>
            <td>
              {{
                member.lastOrderAt
                  ? new Date(member.lastOrderAt).toLocaleString('zh-CN', { hour12: false })
                  : '--'
              }}
            </td>
            <td>
              <div class="action-grid">
                <button
                  class="ghost-btn"
                  :disabled="savingMemberId === member.id"
                  @click="patchMember(member, { balanceDelta: 100 })"
                >
                  充 ¥100
                </button>
                <button
                  class="ghost-btn"
                  :disabled="savingMemberId === member.id"
                  @click="patchMember(member, { pointsDelta: 20 })"
                >
                  加 20 积分
                </button>
                <button
                  class="primary-btn"
                  :disabled="savingMemberId === member.id || member.memberLevel === '钻石会员'"
                  @click="patchMember(member, { memberLevel: '钻石会员' })"
                >
                  升级钻石
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.search-box {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  width: 260px;
  outline: none;
}

.search-box:focus {
  border-color: #667eea;
}

.filter-bar {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
}

.filter-tabs {
  display: flex;
  gap: 4px;
}

.filter-tabs button,
.ghost-btn,
.primary-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.filter-tabs button {
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
}

.filter-tabs button.active {
  background: #667eea;
  color: #ffffff;
  border-color: #667eea;
}

.ghost-btn {
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
}

.primary-btn {
  border: 0;
  background: #667eea;
  color: #ffffff;
}

.ghost-btn:disabled,
.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.level-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.level-vip { background: #fce7f3; color: #9d174d; }
.level-gold { background: #fef9c3; color: #854d0e; }
.level-normal { background: #e0e7ff; color: #3730a3; }

.action-grid {
  display: grid;
  gap: 8px;
}
</style>
