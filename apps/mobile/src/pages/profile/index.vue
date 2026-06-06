<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { memberClient, type MemberProfile } from '../../services/api';
import { useAuthStore } from '../../stores/auth';

const authStore = useAuthStore();
const loading = ref(false);
const profile = ref<MemberProfile | null>(null);

const memberAssets = computed(() => [
  {
    label: '余额',
    value: `¥${(profile.value?.balance ?? 0).toFixed(2)}`
  },
  {
    label: '积分',
    value: `${profile.value?.points ?? 0}`
  },
  {
    label: '优惠券',
    value: `${profile.value?.coupons ?? 0}`
  },
  {
    label: '累计订单',
    value: `${profile.value?.totalOrders ?? 0}`
  }
]);

const growthValueText = computed(() => `${profile.value?.growthValue ?? 0}`);
const addressSummary = computed(() => profile.value?.defaultAddress || '暂未设置收货地址');

async function loadProfile() {
  if (!authStore.isAuthenticated) {
    profile.value = null;
    return;
  }

  loading.value = true;
  try {
    profile.value = await memberClient.getProfile();
  } catch {
    profile.value = null;
    uni.showToast({
      title: '会员资料加载失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
}

function goToLogin() {
  uni.navigateTo({ url: '/pages/login/index' });
}

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    success: (res) => {
      if (res.confirm) {
        authStore.logout();
        profile.value = null;
      }
    }
  });
}

function showTip(name: string) {
  uni.showToast({ title: `「${name}」即将开放`, icon: 'none' });
}

onMounted(() => {
  void loadProfile();
});
</script>

<template>
  <view class="page">
    <view class="profile-card" @tap="authStore.isAuthenticated ? null : goToLogin()">
      <view class="avatar">{{ authStore.displayName.charAt(0) }}</view>
      <view class="profile-info">
        <text class="name">{{ authStore.displayName }}</text>
        <text class="level">{{ authStore.memberLevel }} · 成长值 {{ growthValueText }}</text>
      </view>
      <view v-if="authStore.isAuthenticated" class="logout-link" @tap.stop="handleLogout">
        <text class="logout-text">退出</text>
      </view>
    </view>

    <view class="asset-grid">
      <view v-for="asset in memberAssets" :key="asset.label" class="asset-card">
        <text class="asset-label">{{ asset.label }}</text>
        <text class="asset-value">{{ asset.value }}</text>
      </view>
    </view>

    <view class="address-card">
      <text class="section-title">默认收货地址</text>
      <text class="address-text">{{ addressSummary }}</text>
      <text v-if="profile?.contactMobile" class="address-mobile">{{ profile.contactMobile }}</text>
    </view>

    <view v-if="loading" class="status-card">
      <text class="status-text">正在同步会员资料...</text>
    </view>

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
.menu-panel,
.address-card,
.status-card {
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

.level,
.address-text,
.address-mobile,
.status-text {
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

.asset-label,
.section-title {
  font-size: 24rpx;
  color: #64748b;
}

.asset-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2937;
}

.address-card,
.status-card {
  display: grid;
  gap: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
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
