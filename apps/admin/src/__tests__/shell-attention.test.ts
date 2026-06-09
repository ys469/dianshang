import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('admin shell attention indicators', () => {
  it('shows sidebar indicators for pending orders and unread merchant messages', () => {
    const source = readFileSync(resolve(__dirname, '../shell/ShellLayout.vue'), 'utf8');

    expect(source).toContain('useAttentionStore');
    expect(source).toContain('attentionStore.pendingOrderCount');
    expect(source).toContain('attentionStore.unreadMerchantMessageCount');
    expect(source).toContain('nav-indicator');
    expect(source).toContain('nav-label');
  });
});
