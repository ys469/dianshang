<script setup lang="ts">
const categories = [
  '食品生鲜',
  '美妆护肤',
  '数码家电',
  '母婴用品',
  '运动户外',
  '健康保健',
  '家居百货',
  '会员专区'
];
</script>

<template>
  <view class="page">
    <view class="panel">
      <text class="title">分类导航</text>
      <view class="category-list">
        <view v-for="item in categories" :key="item" class="category-item">
          <text>{{ item }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
}

.panel {
  padding: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
}

.title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.category-list {
  display: grid;
  gap: 14rpx;
}

.category-item {
  padding: 24rpx;
  background: #f8fafc;
  border-radius: 14rpx;
  color: #334155;
}
</style>
