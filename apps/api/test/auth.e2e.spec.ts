import 'reflect-metadata';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('/auth', () => {
  let app: INestApplication;
  const tempDir = join(tmpdir(), 'smart-member-mall-tests');
  const dbFile = join(tempDir, `auth-${Date.now()}.sqlite`);

  beforeAll(async () => {
    mkdirSync(tempDir, { recursive: true });
    process.env.AUTH_DB_FILE = dbFile;
    process.env.JWT_SECRET = 'test-secret';
    process.env.EMAIL_PROVIDER = 'mock';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.AUTH_DB_FILE;
    delete process.env.JWT_SECRET;
    delete process.env.EMAIL_PROVIDER;

    if (existsSync(dbFile)) {
      rmSync(dbFile, { force: true });
    }
  });

  it('registers a member with email and lets the member log in with mobile and password', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      mobile: '13900000001',
      email: 'member01@example.com',
      nickname: '测试会员',
      password: 'member-pass-123',
      confirmPassword: 'member-pass-123'
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.data.user.mobile).toBe('13900000001');
    expect(registerResponse.body.data.user.email).toBe('member01@example.com');
    expect(registerResponse.body.data.user.role).toBe('user');

    const validLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'user',
      account: '13900000001',
      password: 'member-pass-123'
    });

    expect(validLogin.status).toBe(200);
    expect(validLogin.body.data.token).toBeTruthy();
    expect(validLogin.body.data.user.nickname).toBe('测试会员');
  });

  it('rejects registration when password confirmation does not match', async () => {
    const response = await request(app.getHttpServer()).post('/auth/register').send({
      mobile: '13900000009',
      email: 'mismatch@example.com',
      nickname: '确认失败会员',
      password: 'member-pass-123',
      confirmPassword: 'different-pass-456'
    });

    expect(response.status).toBe(400);
    expect(String(response.body.message ?? '')).toContain('密码');
  });

  it('resets a member password by sending a random new password to the registered email', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      mobile: '13900000002',
      email: 'reset-member@example.com',
      nickname: '重置会员',
      password: 'before-reset-123',
      confirmPassword: 'before-reset-123'
    });

    expect(registerResponse.status).toBe(201);

    const resetResponse = await request(app.getHttpServer()).post('/auth/reset-password').send({
      mobile: '13900000002',
      email: 'reset-member@example.com'
    });

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.data.mobile).toBe('13900000002');
    expect(resetResponse.body.data.email).toBe('reset-member@example.com');
    expect(resetResponse.body.data.provider).toBe('mock');
    expect(resetResponse.body.data.debugPassword).toBeTruthy();
    expect(resetResponse.body.data.debugPassword).not.toBe('before-reset-123');

    const oldPasswordLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'user',
      account: '13900000002',
      password: 'before-reset-123'
    });

    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'user',
      account: '13900000002',
      password: resetResponse.body.data.debugPassword
    });

    expect(newPasswordLogin.status).toBe(200);
    expect(newPasswordLogin.body.data.user.nickname).toBe('重置会员');
  });

  it('rejects password reset when the provided mobile and email do not match the same account', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      mobile: '13900000003',
      email: 'owner@example.com',
      nickname: '邮箱校验会员',
      password: 'owner-pass-123',
      confirmPassword: 'owner-pass-123'
    });

    expect(registerResponse.status).toBe(201);

    const resetResponse = await request(app.getHttpServer()).post('/auth/reset-password').send({
      mobile: '13900000003',
      email: 'other@example.com'
    });

    expect(resetResponse.status).toBe(404);
  });

  it('changes a member password when the current password is correct and confirmation matches', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      mobile: '13900000004',
      email: 'change-member@example.com',
      nickname: '修改密码会员',
      password: 'before-change-123',
      confirmPassword: 'before-change-123'
    });

    expect(registerResponse.status).toBe(201);

    const changeResponse = await request(app.getHttpServer()).post('/auth/change-password').send({
      mobile: '13900000004',
      currentPassword: 'before-change-123',
      newPassword: 'after-change-456',
      confirmPassword: 'after-change-456'
    });

    expect(changeResponse.status).toBe(200);
    expect(changeResponse.body.data.mobile).toBe('13900000004');

    const oldPasswordLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'user',
      account: '13900000004',
      password: 'before-change-123'
    });

    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'user',
      account: '13900000004',
      password: 'after-change-456'
    });

    expect(newPasswordLogin.status).toBe(200);
    expect(newPasswordLogin.body.data.user.nickname).toBe('修改密码会员');
  });

  it('rejects password changes when the current password is incorrect', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      mobile: '13900000005',
      email: 'change-wrong-current@example.com',
      nickname: '当前密码错误会员',
      password: 'before-change-123',
      confirmPassword: 'before-change-123'
    });

    expect(registerResponse.status).toBe(201);

    const changeResponse = await request(app.getHttpServer()).post('/auth/change-password').send({
      mobile: '13900000005',
      currentPassword: 'wrong-current-999',
      newPassword: 'after-change-456',
      confirmPassword: 'after-change-456'
    });

    expect(changeResponse.status).toBe(401);
  });

  it('rejects password changes when the new password confirmation does not match', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      mobile: '13900000006',
      email: 'change-confirm@example.com',
      nickname: '确认密码不一致会员',
      password: 'before-change-123',
      confirmPassword: 'before-change-123'
    });

    expect(registerResponse.status).toBe(201);

    const changeResponse = await request(app.getHttpServer()).post('/auth/change-password').send({
      mobile: '13900000006',
      currentPassword: 'before-change-123',
      newPassword: 'after-change-456',
      confirmPassword: 'after-change-789'
    });

    expect(changeResponse.status).toBe(400);
    expect(String(changeResponse.body.message ?? '')).toContain('密码');
  });

  it('keeps admin and member permissions separated', async () => {
    const memberLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });

    expect(memberLogin.status).toBe(200);

    const memberAdminAccess = await request(app.getHttpServer())
      .get('/admin/dashboard/summary')
      .set('Authorization', `Bearer ${memberLogin.body.data.token}`);

    expect(memberAdminAccess.status).toBe(403);

    const adminLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'admin',
      account: 'admin',
      password: 'admin123'
    });

    expect(adminLogin.status).toBe(200);
    expect(adminLogin.body.data.user.role).toBe('admin');

    const adminAccess = await request(app.getHttpServer())
      .get('/admin/dashboard/summary')
      .set('Authorization', `Bearer ${adminLogin.body.data.token}`);

    expect(adminAccess.status).toBe(200);
  });
});
