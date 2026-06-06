import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const mobileRoot = resolve(__dirname, '../..');
const adminRoot = resolve(__dirname, '../../..', 'admin');

const bannedPhrases = [
  '登录演示入口',
  '会员测试账号',
  '管理员测试账号',
  '下单演示',
  'H5 预览',
  '演示数据'
];

describe('production-facing copy', () => {
  it('does not expose demo or test wording in the mobile H5 app shell', () => {
    const source = readFileSync(resolve(mobileRoot, 'src/h5-preview/App.vue'), 'utf8');

    for (const phrase of bannedPhrases) {
      expect(source).not.toContain(phrase);
    }
  });

  it('does not expose test-account hints in the admin login experience', () => {
    const source = readFileSync(resolve(adminRoot, 'src/views/auth/LoginView.vue'), 'utf8');

    expect(source).not.toContain('管理员测试账号');
    expect(source).not.toContain('会员测试账号');
    expect(source).not.toContain('开发验证码');
  });
});
