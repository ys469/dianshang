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

  it('keeps register verification UI and exposes sms login for members', () => {
    const mobileLoginSource = readFileSync(resolve(mobileRoot, 'src/pages/login/index.vue'), 'utf8');
    const h5PreviewSource = readFileSync(resolve(mobileRoot, 'src/h5-preview/App.vue'), 'utf8');

    expect(mobileLoginSource).toContain("handleSendCode('register')");
    expect(mobileLoginSource).toContain('form.smsCode');
    expect(mobileLoginSource).toContain('验证码登录');

    expect(h5PreviewSource).toContain("handleSendCode('register')");
    expect(h5PreviewSource).toContain('registerForm.smsCode');
    expect(h5PreviewSource).toContain('验证码登录');
  });

  it('keeps the public H5 login page member-only', () => {
    const h5PreviewSource = readFileSync(resolve(mobileRoot, 'src/h5-preview/App.vue'), 'utf8');

    expect(h5PreviewSource).not.toContain('管理员登录');
    expect(h5PreviewSource).not.toContain('进入管理后台');
    expect(h5PreviewSource).not.toContain('管理员视图');
    expect(h5PreviewSource).not.toContain('进入真实运营后台');
  });

  it('keeps the admin login page admin-only', () => {
    const adminLoginSource = readFileSync(resolve(adminRoot, 'src/views/auth/LoginView.vue'), 'utf8');

    expect(adminLoginSource).toContain('运营后台');
    expect(adminLoginSource).not.toContain('验证会员账号');
    expect(adminLoginSource).not.toContain('注册会员账号');
    expect(adminLoginSource).not.toContain('短信找回会员密码');
    expect(adminLoginSource).not.toContain("handleSendCode('register')");
  });

  it('removes launch-stage explanatory copy from admin overview pages', () => {
    const quickViewSource = readFileSync(resolve(adminRoot, 'src/views/quick/QuickFeaturesView.vue'), 'utf8');
    const dashboardSource = readFileSync(resolve(adminRoot, 'src/views/dashboard/DashboardView.vue'), 'utf8');

    expect(quickViewSource).toContain('运营工作台');
    expect(quickViewSource).not.toContain('用户端登录隔离');
    expect(quickViewSource).not.toContain('系统状态');
    expect(dashboardSource).toContain('经营看板');
    expect(dashboardSource).not.toContain('首版运营重点');
    expect(dashboardSource).not.toContain('系统覆盖模块');
  });

  it('does not hardcode member asset values in the uni-app profile page', () => {
    const source = readFileSync(resolve(mobileRoot, 'src/pages/profile/index.vue'), 'utf8');

    expect(source).not.toContain('¥120');
    expect(source).not.toContain("'580'");
    expect(source).not.toContain("'4'");
    expect(source).not.toContain('960');
  });
});
