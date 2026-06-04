<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiClient, type AdminOrder } from '../../services/api';

const orders = ref<AdminOrder[]>([]);

onMounted(async () => {
  orders.value = await apiClient.getOrders();
});
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h3>订单管理</h3>
      <p>统一查看待付款、待发货、待提货和售后中的订单状态。</p>
    </div>
    <div class="table-shell">
      <table class="data-table">
        <thead>
          <tr>
            <th>订单号</th>
            <th>状态</th>
            <th>履约方式</th>
            <th>应付金额</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.orderNo">
            <td>{{ order.orderNo }}</td>
            <td>{{ order.status }}</td>
            <td>{{ order.fulfillmentMode }}</td>
            <td>¥{{ order.payableAmount }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
