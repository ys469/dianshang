import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import type { SmsScene } from './auth.dto';

interface MemoryCodeEntry {
  code: string;
  expiresAt: number;
}

@Injectable()
export class SmsCodeStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SmsCodeStoreService.name);
  private readonly memoryCodes = new Map<string, MemoryCodeEntry>();
  private readonly memoryCooldowns = new Map<string, number>();
  private redisClient: RedisClientType | null = null;
  private useMemoryFallback = true;

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL?.trim();
    const redisHost = process.env.REDIS_HOST?.trim();

    if (!redisUrl && !redisHost) {
      return;
    }

    try {
      this.redisClient = createClient(
        redisUrl
          ? {
              url: redisUrl,
              socket: {
                connectTimeout: 1000,
                reconnectStrategy: false
              }
            }
          : {
              socket: {
                host: redisHost,
                port: Number(process.env.REDIS_PORT ?? 6379),
                connectTimeout: 1000,
                reconnectStrategy: false
              }
            }
      );

      this.redisClient.on('error', (error) => {
        this.logger.warn(`Redis unavailable for sms codes, fallback to memory: ${String(error)}`);
      });

      await this.redisClient.connect();
      this.useMemoryFallback = false;
    } catch (error) {
      this.useMemoryFallback = true;
      this.redisClient = null;
      this.logger.warn(`Unable to connect Redis for sms codes, fallback to memory: ${String(error)}`);
    }
  }

  async onModuleDestroy() {
    if (this.redisClient?.isOpen) {
      await this.redisClient.quit();
    }
  }

  getCodeExpiresSeconds() {
    return Number(process.env.SMS_CODE_EXPIRES_SECONDS ?? 300);
  }

  getCooldownSeconds() {
    return Number(process.env.SMS_CODE_COOLDOWN_SECONDS ?? 60);
  }

  async saveCode(mobile: string, scene: SmsScene, code: string) {
    const cooldownActive = await this.isCooldownActive(mobile, scene);
    if (cooldownActive) {
      throw new BadRequestException('验证码发送过于频繁，请稍后再试');
    }

    const expiresInSeconds = this.getCodeExpiresSeconds();
    const cooldownSeconds = this.getCooldownSeconds();

    if (this.redisClient && !this.useMemoryFallback) {
      await this.redisClient.set(this.getCodeKey(mobile, scene), code, {
        EX: expiresInSeconds
      });
      await this.redisClient.set(this.getCooldownKey(mobile, scene), '1', {
        EX: cooldownSeconds
      });
      return;
    }

    this.memoryCodes.set(this.getCodeKey(mobile, scene), {
      code,
      expiresAt: Date.now() + expiresInSeconds * 1000
    });
    this.memoryCooldowns.set(this.getCooldownKey(mobile, scene), Date.now() + cooldownSeconds * 1000);
  }

  async verifyCode(mobile: string, scene: SmsScene, code: string) {
    const normalizedCode = code.trim();

    if (this.redisClient && !this.useMemoryFallback) {
      const cachedCode = await this.redisClient.get(this.getCodeKey(mobile, scene));
      if (!cachedCode || cachedCode !== normalizedCode) {
        return false;
      }

      await this.redisClient.del(this.getCodeKey(mobile, scene));
      return true;
    }

    const entry = this.memoryCodes.get(this.getCodeKey(mobile, scene));
    if (!entry) {
      return false;
    }

    if (entry.expiresAt <= Date.now()) {
      this.memoryCodes.delete(this.getCodeKey(mobile, scene));
      return false;
    }

    if (entry.code !== normalizedCode) {
      return false;
    }

    this.memoryCodes.delete(this.getCodeKey(mobile, scene));
    return true;
  }

  private async isCooldownActive(mobile: string, scene: SmsScene) {
    if (this.redisClient && !this.useMemoryFallback) {
      const cooldownToken = await this.redisClient.get(this.getCooldownKey(mobile, scene));
      return Boolean(cooldownToken);
    }

    const expiresAt = this.memoryCooldowns.get(this.getCooldownKey(mobile, scene));
    if (!expiresAt) {
      return false;
    }

    if (expiresAt <= Date.now()) {
      this.memoryCooldowns.delete(this.getCooldownKey(mobile, scene));
      return false;
    }

    return true;
  }

  private getCodeKey(mobile: string, scene: SmsScene) {
    return `sms-code:${scene}:${mobile}`;
  }

  private getCooldownKey(mobile: string, scene: SmsScene) {
    return `sms-code-cooldown:${scene}:${mobile}`;
  }
}
