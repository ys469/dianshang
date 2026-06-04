<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiClient, type AdminProduct } from '../../services/api';

const products = ref<AdminProduct[]>([]);

onMounted(async () => {
  products.value = await apiClient.getProducts();
});
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h3>商品管理</h3>
      <p>支持商品、会员价、库存和标签的后台管理。</p>
    </div>
    <div class="table-shell">
      <table class="data-table">
        <thead>
          <tr>
            <th>商品名</th>
            <th>售价</th>
            <th>会员价</th>
            <th>库存</th>
            <th>销量</th>
            <th>标签</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id">
            <td>{{ product.name }}</td>
            <td>¥{{ product.price }}</td>
            <td>¥{{ product.memberPrice }}</td>
            <td>{{ product.stock }}</td>
            <td>{{ product.sales }}</td>
            <td>{{ product.tags.join(' / ') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
