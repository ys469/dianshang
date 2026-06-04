<template>
  <view class="page">
    <view class="profile-card">
      <view class="avatar">会</view>
      <view class="profile-info">
        <text class="name">星选会员</text>
        <text class="level">黄金会员 · 成长值 960</text>
      </view>
    </view>

    <view class="asset-grid">
      <view class="asset-card">
        <text class="asset-label">余额</text>
        <text class="asset-value">¥120</text>
      </view>
      <view class="asset-card">
        <text class="asset-label">积分</text>
        <text class="asset-value">580</text>
      </view>
      <view class="asset-card">
        <text class="asset-label">优惠券</text>
        <text class="asset-value">4</text>
      </view>
      <view class="asset-card">
        <text class="asset-label">累计订单</text>
        <text class="asset-value">32</text>
      </view>
    </view>

    <view class="menu-panel">
      <view class="menu-item">我的订单</view>
      <view class="menu-item">收货地址</view>
      <view class="menu-item">签到奖励</view>
      <view class="menu-item">积分商城</view>
      <view class="menu-item">联系客服</view>
      <view class="menu-item">设置</view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
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
}

.name {
  font-size: 32rpx;
  font-weight: 600;
}

.level {
  font-size: 24rpx;
  color: #64748b;
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
