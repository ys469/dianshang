<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { apiClient, type AdminOrder } from '../../services/api';
import {
  canCancelOrderByAdmin,
  canCompleteOrder,
  canShipOrder,
  filterOrders,
  type OrderStatusFilter
} from '../../utils/admin-operations';

type LogisticsDraft = {
  logisticsCompany: string;
  trackingNo: string;
};

const orders = ref<AdminOrder[]>([]);
const loading = ref(true);
const savingOrderNo = ref('');
const errorMsg = ref('');
const successMsg = ref('');
const statusFilter = ref<OrderStatusFilter>('all');
const searchKeyword = ref('');
const logisticsDrafts = reactive<Record<string, LogisticsDraft>>({});

function upsertDraft(order: AdminOrder) {
  if (!logisticsDrafts[order.orderNo]) {
    logisticsDrafts[order.orderNo] = {
      logisticsCompany: order.logisticsCompany || '',
      trackingNo: order.trackingNo || ''
    };
  }
}

function syncDrafts(list: AdminOrder[]) {
  list.forEach(upsertDraft);
}

function sortOrders(list: AdminOrder[]) {
  return [...list].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

async function loadOrders() {
  const result = await apiClient.getOrders();
  orders.value = sortOrders(result);
  syncDrafts(orders.value);
}

onMounted(async () => {
  try {
    await loadOrders();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '加载订单数据失败。';
  } finally {
    loading.value = false;
  }
});

const filteredOrders = computed(() =>
  filterOrders(orders.value, searchKeyword.value, statusFilter.value)
);

const summaryCards = computed(() => [
  { label: '订单总数', value: `${orders.value.length}` },
  { label: '待处理订单', value: `${orders.value.filter((item) => ['待发货', '待收货', '待提货'].includes(item.status)).length}` },
  { label: '待取消确认', value: `${orders.value.filter((item) => canCancelOrderByAdmin(item)).length}` },
  { label: '已完成订单', value: `${orders.value.filter((item) => item.status === '已完成').length}` }
]);

function replaceOrder(updated: AdminOrder) {
  const next = orders.value.map((item) => (item.orderNo === updated.orderNo ? updated : item));
  orders.value = sortOrders(next);
  upsertDraft(updated);
}

function getStatusClass(status: string) {
  if (status.includes('完成')) return 'tag-success';
  if (status.includes('取消')) return 'tag-danger';
  if (status.includes('待付款')) return 'tag-warning';
  return 'tag-info';
}

function getPaymentStateText(order: AdminOrder) {
  const stateMap: Record<AdminOrder['paymentState'], string> = {
    pending: '待支付',
    success: '支付成功',
    failed: '支付失败',
    closed: '已关闭'
  };

  const channelMap: Record<string, string> = {
    balance: '余额支付',
    native: '微信扫码支付',
    h5: '微信 H5 支付'
  };

  return `${stateMap[order.paymentState]}${order.paymentChannel ? ` / ${channelMap[order.paymentChannel] || order.paymentChannel}` : ''}`;
}

function getPaymentMethodText(order: AdminOrder) {
  return order.paymentMethod === 'wechat' ? '微信支付' : '余额支付';
}

function getDraft(orderNo: string) {
  if (!logisticsDrafts[orderNo]) {
    logisticsDrafts[orderNo] = {
      logisticsCompany: '',
      trackingNo: ''
    };
  }

  return logisticsDrafts[orderNo];
}

async function handleShip(order: AdminOrder) {
  const draft = getDraft(order.orderNo);
  if (!draft.logisticsCompany.trim() || !draft.trackingNo.trim()) {
    errorMsg.value = '发货前请填写物流公司和运单号。';
    successMsg.value = '';
    return;
  }

  savingOrderNo.value = order.orderNo;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const updated = await apiClient.updateOrderStatus(order.orderNo, {
      action: 'ship',
      logisticsCompany: draft.logisticsCompany.trim(),
      trackingNo: draft.trackingNo.trim()
    });

    replaceOrder(updated);
    successMsg.value = '订单已发货，物流信息已保存。';
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '发货失败，请稍后重试。';
  } finally {
    savingOrderNo.value = '';
  }
}

async function handleComplete(order: AdminOrder) {
  savingOrderNo.value = order.orderNo;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const updated = await apiClient.updateOrderStatus(order.orderNo, {
      action: 'complete'
    });

    replaceOrder(updated);
    successMsg.value = '订单已完成。';
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '完成订单失败，请稍后重试。';
  } finally {
    savingOrderNo.value = '';
  }
}

async function handleCancel(order: AdminOrder) {
  savingOrderNo.value = order.orderNo;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const updated = await apiClient.updateOrderStatus(order.orderNo, {
      action: 'cancel'
    });

    replaceOrder(updated);
    successMsg.value = '订单已取消，相关库存和会员数据已回滚。';
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '取消订单失败，请稍后重试。';
  } finally {
    savingOrderNo.value = '';
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
        <h3>订单管理</h3>
        <p>处理发货、完成订单、撤销订单，并查看用户收货信息、手机号和物流状态。</p>
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
        placeholder="搜索订单号、姓名、手机号、地址或商品..."
      />
      <div class="filter-tabs">
        <button :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">全部</button>
        <button :class="{ active: statusFilter === 'pending' }" @click="statusFilter = 'pending'">待处理</button>
        <button :class="{ active: statusFilter === 'pickup' }" @click="statusFilter = 'pickup'">待提货</button>
        <button :class="{ active: statusFilter === 'done' }" @click="statusFilter = 'done'">已完成</button>
      </div>
    </div>

    <div v-if="loading" class="loading-text">加载中...</div>

    <div v-else class="order-list">
      <article v-for="order in filteredOrders" :key="order.id" class="order-card">
        <div class="order-head">
          <div class="order-meta">
            <strong>{{ order.orderNo }}</strong>
            <span class="muted-text">下单时间：{{ formatDateTime(order.createdAt) }}</span>
            <span class="muted-text">支付方式：{{ getPaymentMethodText(order) }}</span>
          </div>
          <div class="status-group">
            <span :class="['status-tag', getStatusClass(order.status)]">{{ order.status }}</span>
            <span class="payment-tag">{{ getPaymentStateText(order) }}</span>
          </div>
        </div>

        <div class="order-body">
          <section class="info-block">
            <h4>收货信息</h4>
            <p><span>收货人</span>{{ order.customerName }}</p>
            <p><span>联系电话</span>{{ order.customerMobile }}</p>
            <p><span>收货方式</span>{{ order.fulfillmentMode }}</p>
            <p><span>收货地址</span>{{ order.address }}</p>
          </section>

          <section class="info-block">
            <h4>商品与金额</h4>
            <ul class="item-list">
              <li v-for="item in order.items" :key="`${order.orderNo}-${item.productId}`">
                <span>{{ item.productName }}</span>
                <span>x{{ item.quantity }}</span>
                <strong>¥{{ item.memberPrice.toFixed(2) }}</strong>
              </li>
            </ul>
            <p><span>商品总额</span>¥{{ order.totalAmount.toFixed(2) }}</p>
            <p><span>应付金额</span><strong class="price-text">¥{{ order.payableAmount.toFixed(2) }}</strong></p>
          </section>

          <section class="info-block">
            <h4>履约进度</h4>
            <p><span>物流公司</span>{{ order.logisticsCompany || '--' }}</p>
            <p><span>运单号</span>{{ order.trackingNo || '--' }}</p>
            <p><span>发货时间</span>{{ formatDateTime(order.shippedAt) }}</p>
            <p><span>完成时间</span>{{ formatDateTime(order.completedAt) }}</p>
            <p><span>可撤销截止</span>{{ formatDateTime(order.cancelDeadlineAt) }}</p>
          </section>
        </div>

        <div class="order-actions">
          <div v-if="canShipOrder(order)" class="shipping-form">
            <input
              v-model="getDraft(order.orderNo).logisticsCompany"
              class="field"
              type="text"
              placeholder="物流公司"
            />
            <input
              v-model="getDraft(order.orderNo).trackingNo"
              class="field"
              type="text"
              placeholder="运单号"
            />
            <button
              class="primary-btn"
              :disabled="savingOrderNo === order.orderNo"
              @click="handleShip(order)"
            >
              {{ savingOrderNo === order.orderNo ? '处理中...' : '确认发货' }}
            </button>
          </div>

          <div class="action-row">
            <button
              v-if="canCompleteOrder(order)"
              class="primary-btn"
              :disabled="savingOrderNo === order.orderNo"
              @click="handleComplete(order)"
            >
              {{ savingOrderNo === order.orderNo ? '处理中...' : order.fulfillmentMode === '门店自提' ? '确认提货完成' : '确认收货完成' }}
            </button>

            <button
              v-if="canCancelOrderByAdmin(order)"
              class="danger-btn"
              :disabled="savingOrderNo === order.orderNo"
              @click="handleCancel(order)"
            >
              {{ savingOrderNo === order.orderNo ? '处理中...' : '撤销订单' }}
            </button>
          </div>
        </div>
      </article>
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
  width: 360px;
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
.primary-btn,
.danger-btn {
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

.primary-btn {
  border: 0;
  background: #7c4dff;
  color: #ffffff;
}

.danger-btn {
  border: 1px solid #fecaca;
  background: #fff7f7;
  color: #b91c1c;
}

.primary-btn:disabled,
.danger-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-text {
  padding: 40px;
  text-align: center;
  color: #64748b;
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

.order-list {
  display: grid;
  gap: 16px;
}

.order-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 18px;
  display: grid;
  gap: 16px;
}

.order-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.order-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.order-meta strong {
  font-size: 18px;
  color: #111827;
}

.muted-text {
  color: #64748b;
  font-size: 13px;
}

.status-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-tag,
.payment-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.payment-tag {
  background: #f3f4f6;
  color: #4b5563;
}

.tag-success {
  background: #dcfce7;
  color: #166534;
}

.tag-warning {
  background: #fef9c3;
  color: #854d0e;
}

.tag-danger {
  background: #fee2e2;
  color: #991b1b;
}

.tag-info {
  background: #dbeafe;
  color: #1e40af;
}

.order-body {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.info-block {
  background: #f8fafc;
  border-radius: 8px;
  padding: 14px;
  display: grid;
  gap: 10px;
}

.info-block h4 {
  margin: 0;
  font-size: 14px;
  color: #1f2937;
}

.info-block p,
.item-list li {
  margin: 0;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;
  color: #374151;
}

.info-block p span {
  color: #64748b;
  flex-shrink: 0;
}

.item-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.price-text {
  color: #d97706;
}

.order-actions {
  display: grid;
  gap: 12px;
}

.shipping-form {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.shipping-form .field {
  min-width: 180px;
  flex: 1;
}

.action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 1080px) {
  .stats-grid,
  .order-body {
    grid-template-columns: 1fr;
  }

  .filter-bar,
  .order-head {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    width: 100%;
  }

  .status-group {
    justify-content: flex-start;
  }
}
</style>
