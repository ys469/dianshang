import 'reflect-metadata';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('/member engagement', () => {
  let app: INestApplication;
  let memberToken = '';
  const tempDir = join(tmpdir(), 'smart-member-mall-tests');
  const dbFile = join(tempDir, `member-engagement-${Date.now()}.sqlite`);

  beforeAll(async () => {
    mkdirSync(tempDir, { recursive: true });
    process.env.AUTH_DB_FILE = dbFile;
    process.env.JWT_SECRET = 'member-engagement-secret';
    delete process.env.AI_CUSTOMER_SERVICE_API_KEY;
    delete process.env.AI_CUSTOMER_SERVICE_BASE_URL;
    delete process.env.AI_CUSTOMER_SERVICE_MODEL;

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
  });

  afterAll(async () => {
    await app.close();
    delete process.env.AUTH_DB_FILE;
    delete process.env.JWT_SECRET;

    if (existsSync(dbFile)) {
      rmSync(dbFile, { force: true });
    }
  });

  it('persists daily check-in rewards into the member profile and blocks duplicate check-ins on the same day', async () => {
    const profileBefore = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(profileBefore.status).toBe(200);
    const pointsBefore = profileBefore.body.data.points as number;

    const checkIn = await request(app.getHttpServer())
      .post('/member/check-in')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({});

    expect(checkIn.status).toBe(201);
    expect(checkIn.body.data.rewardPoints).toBeGreaterThan(0);
    expect(checkIn.body.data.profile.points).toBe(pointsBefore + checkIn.body.data.rewardPoints);

    const profileAfter = await request(app.getHttpServer())
      .get('/member/profile')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(profileAfter.status).toBe(200);
    expect(profileAfter.body.data.points).toBe(pointsBefore + checkIn.body.data.rewardPoints);
    expect(profileAfter.body.data.lastCheckInAt).toBeTruthy();

    const duplicateCheckIn = await request(app.getHttpServer())
      .post('/member/check-in')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({});

    expect(duplicateCheckIn.status).toBe(400);
  });

  it('returns an AI customer service reply grounded in the signed-in member context', async () => {
    const response = await request(app.getHttpServer())
      .post('/member/support-chat')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        message: '我现在有多少积分？'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.reply).toContain('积分');
    expect(response.body.data.reply).toContain('13800138000');
  });
});
