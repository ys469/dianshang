import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('admin merchant messages workspace', () => {
  it('registers a dedicated route for merchant conversations', () => {
    const source = readFileSync(resolve(__dirname, '../router/index.ts'), 'utf8');

    expect(source).toContain("/merchant-messages");
    expect(source).toContain('MerchantMessagesView');
  });

  it('exposes merchant messages from both the sidebar and quick actions', () => {
    const shellSource = readFileSync(resolve(__dirname, '../shell/ShellLayout.vue'), 'utf8');
    const quickSource = readFileSync(resolve(__dirname, '../views/quick/QuickFeaturesView.vue'), 'utf8');

    expect(shellSource).toContain('/merchant-messages');
    expect(shellSource).toContain('商家消息');
    expect(quickSource).toContain('/merchant-messages');
    expect(quickSource).toContain('商家消息');
  });

  it('renders a reply-oriented conversation page backed by the merchant message apis', () => {
    const viewSource = readFileSync(
      resolve(__dirname, '../views/merchant/MerchantMessagesView.vue'),
      'utf8'
    );

    expect(viewSource).toContain('getMerchantMessageThreads');
    expect(viewSource).toContain('getMerchantMessageThread');
    expect(viewSource).toContain('replyMerchantMessage');
    expect(viewSource).toContain('回复会员');
    expect(viewSource).toContain('联系商家');
  });
});
