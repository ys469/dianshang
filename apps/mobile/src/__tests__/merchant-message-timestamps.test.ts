import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('merchant message timestamps', () => {
  it('shows a formatted sent time for each merchant conversation message in the H5 member panel', () => {
    const source = readFileSync(resolve(__dirname, '../h5-preview/App.vue'), 'utf8');

    expect(source).toContain('function formatMessageTime');
    expect(source).toContain('formatMessageTime(message.createdAt)');
    expect(source).toContain('class="chat-time"');
  });
});
