import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const mobileRoot = resolve(__dirname, '../..');

describe('mobile h5 entry', () => {
  it('uses a dedicated browser preview entry instead of the uni-app factory entry', () => {
    const html = readFileSync(resolve(mobileRoot, 'index.html'), 'utf8');

    expect(html).toContain('/src/h5-preview.ts');
    expect(html).not.toContain('/src/main.ts');
  });

  it('has a browser preview bootstrap file that mounts the app', () => {
    const previewEntry = resolve(mobileRoot, 'src/h5-preview.ts');

    expect(existsSync(previewEntry)).toBe(true);
    expect(readFileSync(previewEntry, 'utf8')).toContain("mount('#app')");
  });
});
