import 'reflect-metadata';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('/merchant messages', () => {
  let app: INestApplication;
  let memberToken = '';
  let adminToken = '';
  const tempDir = join(tmpdir(), 'smart-member-mall-tests');
  const dbFile = join(tempDir, `merchant-messages-${Date.now()}.sqlite`);
  const runtimeFile = join(tempDir, `merchant-messages-runtime-${Date.now()}.json`);

  beforeAll(async () => {
    mkdirSync(tempDir, { recursive: true });
    process.env.AUTH_DB_FILE = dbFile;
    process.env.RUNTIME_DATA_FILE = runtimeFile;
    process.env.JWT_SECRET = 'merchant-messages-secret';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const memberLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'user',
      account: '13800138000',
      password: 'member123'
    });
    memberToken = memberLogin.body.data.token;

    const adminLogin = await request(app.getHttpServer()).post('/auth/login').send({
      role: 'admin',
      account: 'admin',
      password: 'admin123'
    });
    adminToken = adminLogin.body.data.token;
  });

  afterAll(async () => {
    await app.close();
    delete process.env.AUTH_DB_FILE;
    delete process.env.RUNTIME_DATA_FILE;
    delete process.env.JWT_SECRET;

    if (existsSync(dbFile)) {
      rmSync(dbFile, { force: true });
    }

    if (existsSync(runtimeFile)) {
      rmSync(runtimeFile, { force: true });
    }
  });

  it('lets members contact the merchant and allows admins to reply from the backend', async () => {
    const sendMessage = await request(app.getHttpServer())
      .post('/member/merchant-messages')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        message: '我想确认一下今天下单能不能明天送到？'
      });

    expect(sendMessage.status).toBe(201);
    expect(sendMessage.body.data.messages).toHaveLength(1);
    expect(sendMessage.body.data.messages[0].content).toContain('明天送到');

    const adminThreads = await request(app.getHttpServer())
      .get('/admin/merchant-messages')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminThreads.status).toBe(200);
    expect(adminThreads.body.data).toHaveLength(1);
    expect(adminThreads.body.data[0].memberMobile).toBe('13800138000');
    expect(adminThreads.body.data[0].adminUnreadCount).toBe(1);

    const threadId = adminThreads.body.data[0].threadId as string;

    const adminThreadDetail = await request(app.getHttpServer())
      .get(`/admin/merchant-messages/${threadId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminThreadDetail.status).toBe(200);
    expect(adminThreadDetail.body.data.messages.at(-1).content).toContain('明天送到');

    const replyMessage = await request(app.getHttpServer())
      .post(`/admin/merchant-messages/${threadId}/reply`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        message: '可以，我们会优先安排发货，并在后台同步物流单号。'
      });

    expect(replyMessage.status).toBe(201);
    expect(replyMessage.body.data.messages.at(-1).senderRole).toBe('admin');

    const memberConversation = await request(app.getHttpServer())
      .get('/member/merchant-messages')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(memberConversation.status).toBe(200);
    expect(memberConversation.body.data.messages).toHaveLength(2);
    expect(memberConversation.body.data.messages.at(-1).content).toContain('优先安排发货');
    expect(memberConversation.body.data.unreadCount).toBe(0);

    const notifications = await request(app.getHttpServer())
      .get('/admin/notifications')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(notifications.status).toBe(200);
    expect(
      notifications.body.data.some(
        (item: { type: string; content: string }) =>
          item.type === 'merchant_message' && item.content.includes('13800138000')
      )
    ).toBe(true);
  });
});
