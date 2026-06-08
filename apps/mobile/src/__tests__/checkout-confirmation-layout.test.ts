import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('checkout confirmation layout', () => {
  it('keeps the submit action in a dedicated footer above the tab bar', () => {
    const appVue = readFileSync(resolve(__dirname, '../h5-preview/App.vue'), 'utf8');

    expect(appVue).toContain('class="panel-content confirm-panel-body"');
    expect(appVue).toContain('class="panel-actions confirm-footer"');
    expect(appVue).toContain("class=\"panel-overlay confirm-overlay\"");
    expect(appVue).toContain("['page-frame', { 'dialog-open': confirmDialog.open }]");
    expect(appVue).toContain('v-show="!confirmDialog.open"');
    expect(appVue).toContain('.confirm-overlay {');
    expect(appVue).toContain('.dialog-open .tabbar {');
    expect(appVue).toContain('height: min(calc(100vh - 48px), 860px);');
    expect(appVue).toContain('.confirm-panel-body {');
    expect(appVue).toContain('.confirm-footer {');
    expect(appVue).toContain('z-index: 30;');
  });
});
