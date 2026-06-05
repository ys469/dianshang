<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();

const memberAssets = computed(() => [
  { label: '余额', value: '¥120' },
  { label: '积分', value: '580' },
  { label: '优惠券', value: '4' },
  { label: '累计订单', value: '32' }
]);

function goToLogin() {
  uni.navigateTo({ url: '/pages/login/index' });
}

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        authStore.logout();
      }
    }
  });
}

function showTip(name: string) {
  uni.showToast({ title: `「${name}」即将开放`, icon: 'none' });
}
</script>

<template>
  <view class="page">
    <!-- User Card -->
    <view class="profile-card" @tap="authStore.isAuthenticated ? null : goToLogin()">
      <view class="avatar">{{ authStore.displayName.charAt(0) }}</view>
      <view class="profile-info">
        <text class="name">{{ authStore.displayName }}</text>
        <text class="level">{{ authStore.memberLevel }} · 成长值 960</text>
      </view>
      <view v-if="authStore.isAuthenticated" class="logout-link" @tap.stop="handleLogout">
        <text class="logout-text">退出</text>
      </view>
    </view>

    <!-- Assets -->
    <view class="asset-grid">
      <view v-for="asset in memberAssets" :key="asset.label" class="asset-card">
        <text class="asset-label">{{ asset.label }}</text>
        <text class="asset-value">{{ asset.value }}</text>
      </view>
    </view>

    <!-- Menu -->
    <view class="menu-panel">
      <view class="menu-item" @tap="showTip('我的订单')">我的订单</view>
      <view class="menu-item" @tap="showTip('收货地址')">收货地址</view>
      <view class="menu-item" @tap="showTip('签到奖励')">签到奖励</view>
      <view class="menu-item" @tap="showTip('积分商城')">积分商城</view>
      <view class="menu-item" @tap="showTip('联系客服')">联系客服</view>
      <view class="menu-item" @tap="showTip('设置')">设置</view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background: #f5f7fa;
}

.profile-card,
.asset-card,
.menu-panel {
  background: #ffffff;
  border-radius: 16rpx;
}

.profile-card {
  display: flex;
  gap: 20rpx;
  align-items: center;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.avatar {
  display: grid;
  place-items: center;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #7c4dff;
  color: #ffffff;
  font-size: 34rpx;
  font-weight: 700;
}

.profile-info {
  display: grid;
  gap: 10rpx;
  flex: 1;
}

.name {
  font-size: 32rpx;
  font-weight: 600;
}

.level {
  font-size: 24rpx;
  color: #64748b;
}

.logout-link {
  padding: 8rpx 16rpx;
}

.logout-text {
  font-size: 24rpx;
  color: #dc2626;
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.asset-card {
  display: grid;
  gap: 10rpx;
  padding: 22rpx;
}

.asset-label {
  font-size: 24rpx;
  color: #64748b;
}

.asset-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
}

.menu-panel {
  overflow: hidden;
}

.menu-item {
  padding: 24rpx;
  border-bottom: 1rpx solid #eef2f7;
  color: #334155;
}

.menu-item:last-child {
  border-bottom: 0;
}
</style>
