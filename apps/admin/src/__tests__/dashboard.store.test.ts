import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDashboardStore } from '../stores/dashboard';

describe('dashboard store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads sales metrics from the API client', async () => {
    const store = useDashboardStore();
    await store.fetchSummary();
    expect(store.summary.todaySales).toBeGreaterThan(0);
  });
});
