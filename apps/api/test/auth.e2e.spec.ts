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
    process.env.SMS_PROVIDER = 'mock';

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
    delete process.env.SMS_PROVIDER;

    if (existsSync(dbFile)) {
      rmSync(dbFile, { force: true });
    }
  });

  it('registers a member without requiring an sms code', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      mobile: '13900000001',
      nickname: '测试会员',
      password: 'member-pass-123',
      confirmPassword: 'member-pass-123'
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.data.user.mobile).toBe('13900000001');
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
      nickname: '确认失败会员',
      password: 'member-pass-123',
      confirmPassword: 'different-pass-456'
    });

    expect(response.status).toBe(400);
    expect(String(response.body.message ?? '')).toContain('密码');
  });

  it('resets a member password only when the reset sms code is valid', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      mobile: '13900000002',
      nickname: '重置会员',
      password: 'before-reset-123',
      confirmPassword: 'before-reset-123'
    });

    expect(registerResponse.status).toBe(201);

    const resetCodeResponse = await request(app.getHttpServer()).post('/auth/send-sms-code').send({
      mobile: '13900000002',
      scene: 'reset_password'
    });

    expect(resetCodeResponse.status).toBe(200);
    expect(resetCodeResponse.body.data.scene).toBe('reset_password');

    const invalidReset = await request(app.getHttpServer()).post('/auth/reset-password').send({
      mobile: '13900000002',
      password: 'after-reset-456',
      confirmPassword: 'after-reset-456',
      smsCode: '000000'
    });

    expect(invalidReset.status).toBe(400);

    const resetResponse = await request(app.getHttpServer()).post('/auth/reset-password').send({
      mobile: '13900000002',
      password: 'after-reset-456',
      confirmPassword: 'after-reset-456',
      smsCode: resetCodeResponse.body.data.debugCode
    });

    expect(resetResponse.status).toBe(200);

    const oldPasswordLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'user',
      account: '13900000002',
      password: 'before-reset-123'
    });

    expect(oldPasswordLogin.status).toBe(401);

    const newPasswordLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'user',
      account: '13900000002',
      password: 'after-reset-456'
    });

    expect(newPasswordLogin.status).toBe(200);
    expect(newPasswordLogin.body.data.user.nickname).toBe('重置会员');
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
