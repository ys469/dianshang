import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDemoMallStore } from '../h5-preview/store';
import type { MemberProfile } from '../services/api';

const { getOrdersMock, getProfileMock, loginMock } = vi.hoisted(() => ({
  loginMock: vi.fn(async (role: 'admin' | 'user', account: string) => ({
    token: `${role}-token`,
    user: {
      id: role === 'admin' ? 'admin-1' : 'user-1',
      role,
      nickname: role === 'admin' ? 'Admin Ops' : 'Member User',
      mobile: role === 'user' ? account : '',
      memberLevel: role === 'user' ? 'Gold' : 'Admin'
    }
  })),
  getProfileMock: vi.fn(async (): Promise<MemberProfile> => ({
    id: 'user-1',
    nickname: 'Member User',
    mobile: '13800138000',
    memberLevel: 'Gold',
    balance: 0,
    points: 0,
    growthValue: 0,
    coupons: 0,
    totalOrders: 0,
    totalSpent: 0,
    lastOrderAt: null,
    defaultConsignee: 'Member User',
    contactMobile: '13800138000',
    defaultAddress: 'Shanghai Pudong'
  })),
  getOrdersMock: vi.fn(async () => [])
}));

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');

  return {
    ...actual,
    authClient: {
      ...actual.authClient,
      login: loginMock
    },
    memberClient: {
      ...actual.memberClient,
      getProfile: getProfileMock,
      getOrders: getOrdersMock
    }
  };
});

describe('admin shortcut state', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    loginMock.mockClear();
    getProfileMock.mockClear();
    getOrdersMock.mockClear();
  });

  it('defaults to the product shortcut after admin login', async () => {
    const store = useDemoMallStore();

    const result = await store.login({
      role: 'admin',
      account: 'ops-admin',
      password: 'secret123'
    });

    expect(result.success).toBe(true);
    expect(store.activeAdminShortcut).toBe('products');
  });

  it('switches active admin shortcut when admin opens another module', async () => {
    const store = useDemoMallStore();

    await store.login({
      role: 'admin',
      account: 'ops-admin',
      password: 'secret123'
    });

    const result = store.openAdminShortcut('finance');

    expect(result.success).toBe(true);
    expect(store.activeAdminShortcut).toBe('finance');
  });

  it('blocks admin shortcuts for non-admin sessions', async () => {
    const store = useDemoMallStore();

    const loginResult = await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    const result = store.openAdminShortcut('products');

    expect(loginResult.success).toBe(true);
    expect(result.success).toBe(false);
    expect(store.activeAdminShortcut).toBeNull();
  });
});

describe('admin shortcut template wiring', () => {
  it('wires shortcut buttons to the real admin module jump handler', () => {
    const appVue = readFileSync(resolve(__dirname, '../h5-preview/App.vue'), 'utf8');

    expect(appVue).toContain('@click="handleOpenAdminModule(item.key)"');
  });

  it('surfaces a clear entry to the real admin console and maps module links', () => {
    const appVue = readFileSync(resolve(__dirname, '../h5-preview/App.vue'), 'utf8');

    expect(appVue).toContain('admin-console-panel');
    expect(appVue).toContain('handleOpenAdminConsole');
    expect(appVue).toContain('handleOpenAdminModule(item.key)');
    expect(appVue).toContain('buildAdminConsoleUrl');
  });
});
