<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { apiClient, type AdminOrder } from '../../services/api';

const orders = ref<AdminOrder[]>([]);
const loading = ref(true);
const errorMsg = ref('');
const statusFilter = ref<'all' | 'pending' | 'pickup' | 'done'>('all');
const searchKeyword = ref('');

onMounted(async () => {
  try {
    orders.value = await apiClient.getOrders();
  } catch {
    errorMsg.value = '加载订单数据失败';
  } finally {
    loading.value = false;
  }
});

const filteredOrders = computed(() => {
  let list = orders.value;

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    list = list.filter(
      (order) =>
        order.orderNo.toLowerCase().includes(keyword) ||
        order.customerName.toLowerCase().includes(keyword) ||
        order.customerMobile.includes(keyword) ||
        order.address.toLowerCase().includes(keyword)
    );
  }

  if (statusFilter.value === 'pending') {
    return list.filter((order) => order.status.includes('待付款') || order.status.includes('待发货'));
  }
  if (statusFilter.value === 'pickup') {
    return list.filter((order) => order.status.includes('提货'));
  }
  if (statusFilter.value === 'done') {
    return list.filter((order) => order.status.includes('完成'));
  }

  return list;
});

function getStatusClass(status: string): string {
  if (status.includes('完成')) return 'tag-success';
  if (status.includes('取消')) return 'tag-danger';
  if (status.includes('待付款')) return 'tag-warning';
  return 'tag-info';
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h3>订单管理</h3>
        <p>统一查看订单状态、收货地址、用户手机号和商品摘要</p>
      </div>
    </div>

    <div v-if="errorMsg" class="info-banner">{{ errorMsg }}</div>

    <div class="filter-bar">
      <input
        v-model="searchKeyword"
        class="search-box"
        type="text"
        placeholder="搜索订单号、姓名、手机号、地址..."
      />
      <div class="filter-tabs">
        <button :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">全部</button>
        <button :class="{ active: statusFilter === 'pending' }" @click="statusFilter = 'pending'">待处理</button>
        <button :class="{ active: statusFilter === 'pickup' }" @click="statusFilter = 'pickup'">待提货</button>
        <button :class="{ active: statusFilter === 'done' }" @click="statusFilter = 'done'">已完成</button>
      </div>
    </div>

    <div v-if="loading" class="loading-text">加载中...</div>

    <div v-else class="table-shell">
      <table class="data-table">
        <thead>
          <tr>
            <th>订单号</th>
            <th>用户信息</th>
            <th>状态</th>
            <th>履约方式</th>
            <th>商品摘要</th>
            <th>地址</th>
            <th>金额</th>
            <th>下单时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in filteredOrders" :key="order.id">
            <td>{{ order.orderNo }}</td>
            <td>
              <div class="user-cell">
                <strong>{{ order.customerName }}</strong>
                <span>{{ order.customerMobile }}</span>
              </div>
            </td>
            <td>
              <span :class="['status-tag', getStatusClass(order.status)]">{{ order.status }}</span>
            </td>
            <td>{{ order.fulfillmentMode }}</td>
            <td>
              <div class="summary-cell">
                <strong>{{ order.itemCount }} 件</strong>
                <span>{{ order.itemSummary }}</span>
              </div>
            </td>
            <td class="address-cell">{{ order.address }}</td>
            <td><strong>¥{{ order.payableAmount.toFixed(2) }}</strong></td>
            <td>{{ new Date(order.createdAt).toLocaleString('zh-CN', { hour12: false }) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
}

.search-box {
  width: 320px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}

.search-box:focus {
  border-color: #667eea;
}

.filter-tabs {
  display: flex;
  gap: 4px;
}

.filter-tabs button {
  padding: 6px 14px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  color: #374151;
}

.filter-tabs button.active {
  background: #667eea;
  color: #ffffff;
  border-color: #667eea;
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

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.tag-success { background: #dcfce7; color: #166534; }
.tag-warning { background: #fef9c3; color: #854d0e; }
.tag-danger { background: #fee2e2; color: #991b1b; }
.tag-info { background: #dbeafe; color: #1e40af; }

.user-cell,
.summary-cell {
  display: grid;
  gap: 4px;
}

.user-cell span,
.summary-cell span {
  font-size: 12px;
  color: #64748b;
}

.address-cell {
  min-width: 220px;
  color: #374151;
}
</style>
