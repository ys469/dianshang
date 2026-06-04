export interface HomePayload {
  banners: Array<{ id: string; title: string; image: string }>;
  categories: Array<{ id: string; name: string }>;
  notice: string;
  sections: Array<{
    id: string;
    type: string;
    title: string;
    products: Array<{
      id: string;
      name: string;
      price: number;
      memberPrice: number;
      image: string;
      tags: string[];
    }>;
  }>;
}

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000';

const fallbackHome: HomePayload = {
  banners: [
    {
      id: 'b-001',
      title: '社区团购精选会场',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80'
    },
    {
      id: 'b-002',
      title: '会员专享爆款直降',
      image: 'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?auto=format&fit=crop&w=1200&q=80'
    }
  ],
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
  notice: '新人专享券和今日秒杀已上线',
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
          image: 'https://images.unsplash.com/photo-1471943311424-646960669fbc?auto=format&fit=crop&w=800&q=80',
          tags: ['爆款', '会员价']
        },
        {
          id: 'p-002',
          name: '家庭装洗衣凝珠',
          price: 39.9,
          memberPrice: 32.9,
          image: 'https://images.unsplash.com/photo-1583947582886-f40ec95dd752?auto=format&fit=crop&w=800&q=80',
          tags: ['秒杀']
        }
      ]
    },
    {
      id: 'hs-002',
      type: 'member_exclusive',
      title: '会员专享',
      products: [
        {
          id: 'p-003',
          name: '每日益生菌礼装',
          price: 129,
          memberPrice: 109,
          image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80',
          tags: ['会员专享']
        }
      ]
    }
  ]
};

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${apiBase}${path}`);
    if (!response.ok) {
      return fallback;
    }
    const body = await response.json();
    return body.data as T;
  } catch {
    return fallback;
  }
}

export const apiClient = {
  getHome() {
    return fetchJson('/home', fallbackHome);
  }
};
