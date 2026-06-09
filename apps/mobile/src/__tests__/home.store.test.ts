import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomePayload } from '../services/api';
import { useHomeStore } from '../stores/home';

const { getHomeMock } = vi.hoisted(() => ({
  getHomeMock: vi.fn()
}));

vi.mock('../services/api', () => ({
  apiClient: {
    getHome: getHomeMock
  }
}));

const sampleHomePayload: HomePayload = {
  banners: [{ id: 'b-001', title: '社区团购精选会场', image: 'https://example.com/banner-1.jpg' }],
  categories: [
    { id: 'food', name: '食品生鲜' },
    { id: 'beauty', name: '美妆护肤' },
    { id: 'digital', name: '数码家电' },
    { id: 'baby', name: '母婴用品' },
    { id: 'sports', name: '运动户外' },
    { id: 'health', name: '健康保健' },
    { id: 'home', name: '家居百货' },
    { id: 'member', name: '会员专区' }
  ],
  notice: '会员折扣、在线充值、营销活动和后台订单已经全部打通。',
  sections: [
    {
      id: 'hs-001',
      type: 'flash_sale',
      title: '限时秒杀',
      products: [
        {
          id: 'p-001',
          name: '甄选阳光蜜桃礼盒',
          price: 59.9,
          memberPrice: 49.9,
          image: 'https://example.com/product-1.jpg',
          tags: ['爆款']
        }
      ]
    }
  ]
};

describe('home store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    getHomeMock.mockReset();
  });

  it('loads banner and product floors for the homepage', async () => {
    getHomeMock.mockResolvedValue(sampleHomePayload);
    const store = useHomeStore();
    await store.fetchHome();
    expect(store.sections.length).toBeGreaterThan(0);
    expect(store.categories.length).toBeGreaterThanOrEqual(8);
  });

  it('tracks the first homepage request until it resolves', async () => {
    let resolveHomeRequest: ((payload: HomePayload) => void) | null = null;
    getHomeMock.mockImplementationOnce(
      () =>
        new Promise<HomePayload>((resolve) => {
          resolveHomeRequest = resolve;
        })
    );

    const store = useHomeStore();
    const fetchPromise = store.fetchHome();

    expect(store.isLoading).toBe(true);
    expect(store.hasLoaded).toBe(false);

    resolveHomeRequest?.(sampleHomePayload);
    await fetchPromise;

    expect(store.isLoading).toBe(false);
    expect(store.hasLoaded).toBe(true);
    expect(store.sections).toHaveLength(1);
  });

  it('keeps the existing homepage data visible while a refresh is running', async () => {
    getHomeMock.mockResolvedValueOnce(sampleHomePayload);

    const store = useHomeStore();
    await store.fetchHome();

    let resolveRefresh: ((payload: HomePayload) => void) | null = null;
    getHomeMock.mockImplementationOnce(
      () =>
        new Promise<HomePayload>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    const refreshPromise = store.fetchHome();

    expect(store.isLoading).toBe(true);
    expect(store.hasLoaded).toBe(true);
    expect(store.sections[0]?.products[0]?.name).toBe('甄选阳光蜜桃礼盒');

    resolveRefresh?.({
      ...sampleHomePayload,
      sections: [
        {
          ...sampleHomePayload.sections[0],
          products: [
            {
              ...sampleHomePayload.sections[0].products[0],
              name: '每日益生菌礼装'
            }
          ]
        }
      ]
    });

    await refreshPromise;

    expect(store.isLoading).toBe(false);
    expect(store.sections[0]?.products[0]?.name).toBe('每日益生菌礼装');
  });
});
