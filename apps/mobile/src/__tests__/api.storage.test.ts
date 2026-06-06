import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class MemoryStorage {
  private readonly store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

describe('api client storage fallback', () => {
  const originalFetch = globalThis.fetch;
  const originalLocalStorage = globalThis.localStorage;
  const originalUni = (globalThis as typeof globalThis & { uni?: unknown }).uni;

  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as typeof globalThis & { uni?: unknown }).uni;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage()
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalLocalStorage
    });

    if (typeof originalUni === 'undefined') {
      delete (globalThis as typeof globalThis & { uni?: unknown }).uni;
    } else {
      (globalThis as typeof globalThis & { uni?: unknown }).uni = originalUni;
    }
  });

  it('sends the bearer token from browser localStorage when uni storage is unavailable', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          code: 0,
          message: 'ok',
          data: {
            id: 'member-1',
            nickname: 'Local Member',
            mobile: '13800138000',
            memberLevel: 'Gold',
            balance: 88,
            points: 16,
            growthValue: 0,
            coupons: 0,
            totalOrders: 0,
            totalSpent: 0,
            lastOrderAt: null,
            defaultConsignee: 'Local Member',
            contactMobile: '13800138000',
            defaultAddress: 'Shanghai Pudong Zhangjiang Rd 88'
          }
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    globalThis.fetch = fetchMock as typeof globalThis.fetch;
    globalThis.localStorage.setItem('smart-member-mobile-token', 'browser-token');

    const { memberClient } = await import('../services/api');

    await memberClient.getProfile();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/member/profile'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer browser-token'
        })
      })
    );
  });
});
