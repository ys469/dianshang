<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { apiClient, type AdminMember } from '../../services/api';

const memberLevelOptions = ['普通会员', '黄金会员', '铂金会员', '钻石会员', '至尊会员'] as const;

type LevelFilter = 'all' | (typeof memberLevelOptions)[number];

type MemberDraft = {
  memberLevel: string;
  balanceDelta: number;
  pointsDelta: number;
  growthDelta: number;
  couponsDelta: number;
};

const members = ref<AdminMember[]>([]);
const loading = ref(true);
const savingMemberId = ref('');
const editingMemberId = ref('');
const errorMsg = ref('');
const successMsg = ref('');
const searchKeyword = ref('');
const levelFilter = ref<LevelFilter>('all');
const drafts = reactive<Record<string, MemberDraft>>({});

function syncDraft(member: AdminMember) {
  drafts[member.id] = {
    memberLevel: member.memberLevel,
    balanceDelta: 0,
    pointsDelta: 0,
    growthDelta: 0,
    couponsDelta: 0
  };
}

function replaceMember(updated: AdminMember) {
  members.value = members.value.map((item) => (item.id === updated.id ? updated : item));
  syncDraft(updated);
}

async function loadMembers() {
  const result = await apiClient.getMembers();
  members.value = result;
  result.forEach(syncDraft);
}

onMounted(async () => {
  try {
    await loadMembers();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '加载会员数据失败。';
  } finally {
    loading.value = false;
  }
});

const filteredMembers = computed(() => {
  let list = members.value;

  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase();
    list = list.filter(
      (member) =>
        member.nickname.toLowerCase().includes(keyword) || member.mobile.includes(keyword)
    );
  }

  if (levelFilter.value !== 'all') {
    list = list.filter((member) => member.memberLevel === levelFilter.value);
  }

  return list;
});

const summaryCards = computed(() => [
  { label: '会员总数', value: `${members.value.length}` },
  { label: '高等级会员', value: `${members.value.filter((item) => ['钻石会员', '至尊会员'].includes(item.memberLevel)).length}` },
  { label: '累计余额', value: `¥${members.value.reduce((sum, item) => sum + item.balance, 0).toFixed(2)}` },
  { label: '累计积分', value: `${members.value.reduce((sum, item) => sum + item.points, 0)}` }
]);

function getLevelClass(level: string) {
  if (level.includes('至尊') || level.includes('钻石')) return 'level-vip';
  if (level.includes('黄金') || level.includes('铂金')) return 'level-gold';
  return 'level-normal';
}

function resetDraftAdjustments(memberId: string) {
  drafts[memberId].balanceDelta = 0;
  drafts[memberId].pointsDelta = 0;
  drafts[memberId].growthDelta = 0;
  drafts[memberId].couponsDelta = 0;
}

function beginEdit(member: AdminMember) {
  editingMemberId.value = member.id;
  syncDraft(member);
  errorMsg.value = '';
  successMsg.value = '';
}

function cancelEdit() {
  editingMemberId.value = '';
}

async function saveMember(member: AdminMember) {
  const draft = drafts[member.id];
  savingMemberId.value = member.id;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const updated = await apiClient.updateMember(member.id, {
      memberLevel: draft.memberLevel,
      balanceDelta: Number(draft.balanceDelta) || 0,
      pointsDelta: Number(draft.pointsDelta) || 0,
      growthDelta: Number(draft.growthDelta) || 0,
      couponsDelta: Number(draft.couponsDelta) || 0
    });

    replaceMember(updated);
    resetDraftAdjustments(member.id);
    editingMemberId.value = '';
    successMsg.value = '会员资料已更新，余额、积分和等级变更已同步生效。';
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '会员更新失败，请稍后重试。';
    successMsg.value = '';
  } finally {
    savingMemberId.value = '';
  }
}

function formatDateTime(value: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h3>会员管理</h3>
        <p>查看会员消费数据，并直接调整等级、余额、积分、成长值和优惠券数量。</p>
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
        placeholder="搜索昵称或手机号..."
        type="text"
      />
      <div class="filter-tabs">
        <button :class="{ active: levelFilter === 'all' }" @click="levelFilter = 'all'">全部</button>
        <button
          v-for="level in memberLevelOptions"
          :key="level"
          :class="{ active: levelFilter === level }"
          @click="levelFilter = level"
        >
          {{ level }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-text">加载中...</div>

    <div v-else class="table-shell">
      <table class="data-table">
        <thead>
          <tr>
            <th>会员信息</th>
            <th>会员等级</th>
            <th>余额</th>
            <th>积分</th>
            <th>成长值</th>
            <th>优惠券</th>
            <th>累计订单</th>
            <th>累计消费</th>
            <th>最近下单</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in filteredMembers" :key="member.id">
            <td>
              <div class="member-cell">
                <strong>{{ member.nickname }}</strong>
                <span>{{ member.mobile }}</span>
              </div>
            </td>
            <td>
              <template v-if="editingMemberId === member.id">
                <select v-model="drafts[member.id].memberLevel" class="field">
                  <option v-for="level in memberLevelOptions" :key="level" :value="level">
                    {{ level }}
                  </option>
                </select>
              </template>
              <template v-else>
                <span :class="['level-tag', getLevelClass(member.memberLevel)]">
                  {{ member.memberLevel }}
                </span>
              </template>
            </td>
            <td><strong>¥{{ member.balance.toFixed(2) }}</strong></td>
            <td>{{ member.points }}</td>
            <td>{{ member.growthValue }}</td>
            <td>{{ member.coupons }}</td>
            <td>{{ member.totalOrders }}</td>
            <td><strong>¥{{ member.totalSpent.toFixed(2) }}</strong></td>
            <td>{{ formatDateTime(member.lastOrderAt) }}</td>
            <td>
              <div class="action-column">
                <button
                  class="ghost-btn"
                  :disabled="savingMemberId === member.id"
                  @click="editingMemberId === member.id ? cancelEdit() : beginEdit(member)"
                >
                  {{ editingMemberId === member.id ? '取消编辑' : '编辑会员' }}
                </button>

                <div v-if="editingMemberId === member.id" class="adjust-grid">
                  <label>
                    <span>余额变动</span>
                    <input v-model="drafts[member.id].balanceDelta" class="field" type="number" step="0.01" />
                  </label>
                  <label>
                    <span>积分变动</span>
                    <input v-model="drafts[member.id].pointsDelta" class="field" type="number" step="1" />
                  </label>
                  <label>
                    <span>成长值变动</span>
                    <input v-model="drafts[member.id].growthDelta" class="field" type="number" step="1" />
                  </label>
                  <label>
                    <span>优惠券变动</span>
                    <input v-model="drafts[member.id].couponsDelta" class="field" type="number" step="1" />
                  </label>
                </div>

                <button
                  v-if="editingMemberId === member.id"
                  class="primary-btn"
                  :disabled="savingMemberId === member.id"
                  @click="saveMember(member)"
                >
                  {{ savingMemberId === member.id ? '保存中...' : '保存变更' }}
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
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
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
.field {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}

.search-box {
  width: 260px;
}

.search-box:focus,
.field:focus {
  border-color: #7c4dff;
}

.filter-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-tabs button,
.ghost-btn,
.primary-btn {
  padding: 8px 14px;
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
  background: #7c4dff;
  color: #ffffff;
  border-color: #7c4dff;
}

.ghost-btn {
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
}

.primary-btn {
  border: 0;
  background: #7c4dff;
  color: #ffffff;
}

.ghost-btn:disabled,
.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.info-banner {
  border: 1px solid transparent;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
}

.info-banner.error {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #be123c;
}

.info-banner.success {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #047857;
}

.loading-text {
  padding: 40px;
  text-align: center;
  color: #64748b;
}

.member-cell {
  display: grid;
  gap: 4px;
}

.member-cell span {
  font-size: 12px;
  color: #64748b;
}

.level-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.level-vip {
  background: #fce7f3;
  color: #9d174d;
}

.level-gold {
  background: #fef9c3;
  color: #854d0e;
}

.level-normal {
  background: #e0e7ff;
  color: #3730a3;
}

.action-column {
  display: grid;
  gap: 10px;
  min-width: 180px;
}

.adjust-grid {
  display: grid;
  gap: 10px;
}

.adjust-grid label {
  display: grid;
  gap: 6px;
}

.adjust-grid span {
  font-size: 12px;
  color: #64748b;
}

@media (max-width: 1080px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    width: 100%;
  }
}
</style>
