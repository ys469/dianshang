import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('mobile storefront layout density', () => {
  it('keeps key storefront modules in multi-column layouts on phone widths', () => {
    const source = readFileSync(resolve(__dirname, '../h5-preview/App.vue'), 'utf8');

    expect(source).toContain('.category-list,');
    expect(source).toContain('.menu-list,');
    expect(source).toContain('.order-list {');
    expect(source).toContain('@media (max-width: 720px)');
    expect(source).toContain('.banner-strip,');
    expect(source).toContain('.product-grid,');
    expect(source).toContain('.category-list,');
    expect(source).toContain('.menu-list,');
    expect(source).toContain('.order-list,');
    expect(source).toContain('@media (max-width: 420px)');
  });
});
