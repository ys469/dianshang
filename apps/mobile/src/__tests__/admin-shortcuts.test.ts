import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public member H5 login surface', () => {
  it('does not embed admin controls in the public login template', () => {
    const appVue = readFileSync(resolve(__dirname, '../h5-preview/App.vue'), 'utf8');

    expect(appVue).not.toContain('管理员登录');
    expect(appVue).not.toContain('进入管理后台');
    expect(appVue).not.toContain('管理员视图');
    expect(appVue).not.toContain('handleOpenAdminConsole');
  });

  it('keeps member login, register, and reset entry points visible', () => {
    const appVue = readFileSync(resolve(__dirname, '../h5-preview/App.vue'), 'utf8');

    expect(appVue).toContain('密码登录');
    expect(appVue).toContain('验证码登录');
    expect(appVue).toContain('注册会员账号');
    expect(appVue).toContain('忘记密码');
  });
});
