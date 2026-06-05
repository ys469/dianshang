import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { filterProducts, useDemoMallStore } from '../h5-preview/store';
import type { HomePayload } from '../services/api';

const sampleProduct: HomePayload['sections'][number]['products'][number] = {
  id: 'p-001',
  name: '阳光水蜜桃礼盒',
  price: 59.9,
  memberPrice: 49.9,
  image: 'https://example.com/peach.jpg',
  tags: ['爆款', '会员价']
};

describe('demo mall store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('merges repeated add-to-cart actions into one cart line', () => {
    const store = useDemoMallStore();

    store.addToCart(sampleProduct);
    store.addToCart(sampleProduct);

    expect(store.cart).toHaveLength(1);
    expect(store.cart[0].quantity).toBe(2);
  });

  it('creates an order, clears the cart, and updates member assets on checkout', async () => {
    const store = useDemoMallStore();

    store.addToCart(sampleProduct);
    store.addToCart({
      ...sampleProduct,
      id: 'p-002',
      name: '益生菌礼盒',
      price: 129,
      memberPrice: 109
    });

    const result = await store.checkout();

    expect(result.success).toBe(true);
    expect(store.cart).toHaveLength(0);
    expect(store.orders).toHaveLength(1);
    expect(store.walletBalance).toBeCloseTo(520 - 49.9 - 109, 5);
    expect(store.points).toBe(595);
  });

  it('only grants the daily sign-in reward once', () => {
    const store = useDemoMallStore();

    const firstReward = store.claimDailyCheckIn();
    const secondReward = store.claimDailyCheckIn();

    expect(firstReward.success).toBe(true);
    expect(secondReward.success).toBe(false);
    expect(store.points).toBe(600);
  });

  it('filters products by the search keyword', () => {
    const results = filterProducts(
      [
        sampleProduct,
        {
          ...sampleProduct,
          id: 'p-003',
          name: '每日益生菌礼盒',
          tags: ['会员专享']
        }
      ],
      '益生菌'
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('p-003');
  });

  it('tracks pending and submitted search keywords separately', () => {
    const store = useDemoMallStore();

    store.setSearchDraft('益生菌');
    expect(store.searchQuery).toBe('');

    store.submitSearch();
    expect(store.searchQuery).toBe('益生菌');
  });

  it('supports separate user and admin login states', async () => {
    const store = useDemoMallStore();

    const userResult = await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    expect(userResult.success).toBe(true);
    expect(store.isAuthenticated).toBe(true);
    expect(store.currentRole).toBe('user');

    store.logout();

    const adminResult = await store.login({
      role: 'admin',
      account: 'admin',
      password: 'admin123'
    });

    expect(adminResult.success).toBe(true);
    expect(store.currentRole).toBe('admin');
    expect(store.currentUserName).toBe('运营管理员');
  });
});
