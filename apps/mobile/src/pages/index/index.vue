<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useHomeStore } from '../../stores/home';

const homeStore = useHomeStore();
const { banners, categories, notice, sections } = storeToRefs(homeStore);

void homeStore.fetchHome();
</script>

<template>
  <scroll-view scroll-y class="page">
    <view class="hero">
      <view class="search-box">搜索商品 / 品牌 / 活动</view>
      <view class="notice-row">
        <text class="notice-badge">公告</text>
        <text class="notice-text">{{ notice }}</text>
      </view>
      <swiper class="banner-swiper" indicator-dots autoplay circular>
        <swiper-item v-for="banner in banners" :key="banner.id">
          <image class="banner-image" :src="banner.image" mode="aspectFill" />
          <view class="banner-title">{{ banner.title }}</view>
        </swiper-item>
      </swiper>
    </view>

    <view class="card-grid category-grid">
      <view v-for="item in categories" :key="item.id" class="category-card">
        <view class="category-icon">{{ item.name.slice(0, 1) }}</view>
        <text>{{ item.name }}</text>
      </view>
    </view>

    <view v-for="section in sections" :key="section.id" class="floor">
      <view class="floor-head">
        <text class="floor-title">{{ section.title }}</text>
        <text class="floor-action">更多</text>
      </view>
      <scroll-view scroll-x class="product-row">
        <view class="product-list">
          <view v-for="product in section.products" :key="product.id" class="product-card">
            <image class="product-image" :src="product.image" mode="aspectFill" />
            <text class="product-name">{{ product.name }}</text>
            <text class="product-price">¥{{ product.memberPrice }}</text>
            <text class="product-market">¥{{ product.price }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </scroll-view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
}

.hero,
.floor,
.category-grid {
  margin-bottom: 24rpx;
}

.search-box,
.notice-row,
.category-card,
.product-card {
  background: #ffffff;
  border-radius: 16rpx;
}

.search-box {
  padding: 22rpx 28rpx;
  color: #6b7280;
  margin-bottom: 18rpx;
}

.notice-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
  padding: 18rpx 22rpx;
  margin-bottom: 18rpx;
}

.notice-badge {
  color: #7c4dff;
  font-weight: 600;
}

.notice-text {
  color: #475467;
  font-size: 26rpx;
}

.banner-swiper {
  height: 280rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.banner-image {
  width: 100%;
  height: 100%;
}

.banner-title {
  position: absolute;
  left: 24rpx;
  bottom: 24rpx;
  color: #ffffff;
  font-size: 34rpx;
  font-weight: 600;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16rpx;
}

.category-card {
  display: grid;
  justify-items: center;
  gap: 12rpx;
  padding: 24rpx 10rpx;
  font-size: 24rpx;
  color: #334155;
}

.category-icon {
  display: grid;
  place-items: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #f2ecff;
  color: #7c4dff;
  font-weight: 700;
}

.floor {
  padding: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
}

.floor-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.floor-title {
  font-size: 30rpx;
  font-weight: 600;
}

.floor-action {
  color: #7c4dff;
  font-size: 24rpx;
}

.product-row {
  white-space: nowrap;
}

.product-list {
  display: flex;
  gap: 16rpx;
}

.product-card {
  width: 220rpx;
  padding: 16rpx;
}

.product-image {
  width: 188rpx;
  height: 188rpx;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}

.product-name {
  display: block;
  min-height: 72rpx;
  font-size: 24rpx;
  color: #1f2937;
}

.product-price {
  display: block;
  margin-top: 8rpx;
  color: #7c4dff;
  font-size: 28rpx;
  font-weight: 600;
}

.product-market {
  display: block;
  margin-top: 4rpx;
  color: #94a3b8;
  font-size: 22rpx;
  text-decoration: line-through;
}
</style>
