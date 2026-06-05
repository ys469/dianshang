import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDemoMallStore } from '../h5-preview/store';

describe('admin shortcut state', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('defaults to the product shortcut after admin login', async () => {
    const store = useDemoMallStore();

    await store.login({
      role: 'admin',
      account: 'admin',
      password: 'admin123'
    });

    expect(store.activeAdminShortcut).toBe('products');
  });

  it('switches active admin shortcut when admin opens another module', async () => {
    const store = useDemoMallStore();

    await store.login({
      role: 'admin',
      account: 'admin',
      password: 'admin123'
    });

    const result = store.openAdminShortcut('finance');

    expect(result.success).toBe(true);
    expect(store.activeAdminShortcut).toBe('finance');
  });

  it('blocks admin shortcuts for non-admin sessions', async () => {
    const store = useDemoMallStore();

    await store.login({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    const result = store.openAdminShortcut('products');

    expect(result.success).toBe(false);
    expect(store.activeAdminShortcut).toBeNull();
  });
});

describe('admin shortcut template wiring', () => {
  it('wires shortcut buttons to the admin shortcut click handler', () => {
    const appVue = readFileSync(resolve(__dirname, '../h5-preview/App.vue'), 'utf8');

    expect(appVue).toContain('@click="handleAdminShortcut');
  });
});
