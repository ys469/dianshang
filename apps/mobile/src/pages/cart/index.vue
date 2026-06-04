<template>
  <view class="page">
    <view class="panel">
      <text class="title">购物车</text>
      <view class="cart-item">
        <view>
          <text class="item-name">甄选阳光蜜桃礼盒</text>
          <text class="item-meta">会员价 ¥49.9 x 2</text>
        </view>
        <text class="item-price">¥99.8</text>
      </view>
      <view class="cart-item">
        <view>
          <text class="item-name">每日益生菌礼装</text>
          <text class="item-meta">会员价 ¥109 x 1</text>
        </view>
        <text class="item-price">¥109</text>
      </view>
      <view class="checkout-bar">
        <view>
          <text class="summary-label">合计</text>
          <text class="summary-price">¥208.8</text>
        </view>
        <view class="checkout-button">去结算</view>
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

.cart-item {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #e2e8f0;
}

.item-name,
.item-meta,
.item-price,
.summary-label,
.summary-price {
  display: block;
}

.item-name {
  font-size: 28rpx;
  color: #1f2937;
}

.item-meta {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #64748b;
}

.item-price {
  font-size: 28rpx;
  font-weight: 600;
  color: #7c4dff;
}

.checkout-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24rpx;
}

.summary-label {
  font-size: 24rpx;
  color: #64748b;
}

.summary-price {
  margin-top: 8rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2937;
}

.checkout-button {
  padding: 20rpx 38rpx;
  border-radius: 999rpx;
  background: #7c4dff;
  color: #ffffff;
  font-size: 26rpx;
}
</style>
