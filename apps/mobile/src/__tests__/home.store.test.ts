import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useHomeStore } from '../stores/home';

describe('home store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads banner and product floors for the homepage', async () => {
    const store = useHomeStore();
    await store.fetchHome();
    expect(store.sections.length).toBeGreaterThan(0);
    expect(store.categories.length).toBeGreaterThanOrEqual(8);
  });
});
