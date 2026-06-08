import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('admin mobile layout', () => {
  it('uses a drawer sidebar and stacked shell layout on narrow screens', () => {
    const source = readFileSync(resolve(__dirname, '../shell/ShellLayout.vue'), 'utf8');

    expect(source).toContain('menuOpen');
    expect(source).toContain('menu-toggle');
    expect(source).toContain('sidebar-mask');
    expect(source).toContain('@media (max-width: 960px)');
    expect(source).toContain('grid-template-columns: 1fr');
    expect(source).toContain('transform: translateX(-100%)');
  });

  it('keeps product stats and form fields in a denser mobile grid', () => {
    const source = readFileSync(resolve(__dirname, '../views/products/ProductListView.vue'), 'utf8');

    expect(source).toContain('@media (max-width: 720px)');
    expect(source).toContain('.stats-grid');
    expect(source).toContain('repeat(2, minmax(0, 1fr))');
    expect(source).toContain('.compact-field');
    expect(source).toContain('grid-column: span 2');
  });
});
