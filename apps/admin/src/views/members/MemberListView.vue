<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { apiClient, type AdminMember } from '../../services/api';

const members = ref<AdminMember[]>([]);

onMounted(async () => {
  members.value = await apiClient.getMembers();
});
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h3>会员管理</h3>
      <p>查看会员等级、积分、优惠券和活跃度相关信息。</p>
    </div>
    <div class="table-shell">
      <table class="data-table">
        <thead>
          <tr>
            <th>昵称</th>
            <th>手机号</th>
            <th>会员等级</th>
            <th>积分</th>
            <th>优惠券</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in members" :key="member.mobile">
            <td>{{ member.nickname }}</td>
            <td>{{ member.mobile }}</td>
            <td>{{ member.memberLevel }}</td>
            <td>{{ member.points }}</td>
            <td>{{ member.coupons }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
