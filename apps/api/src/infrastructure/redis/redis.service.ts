import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { MemoryStore } from '../memory/memory.store';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private memoryFallback = true;

  constructor(
    private readonly config: ConfigService,
    private readonly memory: MemoryStore,
  ) {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.log('REDIS_URL unset — using in-memory cache');
      return;
    }
    try {
      const redis = new Redis(url, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        lazyConnect: true,
      });
      this.client = redis;
      void redis
        .connect()
        .then(() => {
          this.memoryFallback = false;
          this.logger.log('Redis connected');
        })
        .catch((err: Error) => {
          this.logger.warn(`Redis unavailable — memory fallback: ${err.message}`);
          void redis.disconnect();
          this.client = null;
          this.memoryFallback = true;
        });
    } catch (err) {
      this.logger.warn(`Redis init failed: ${(err as Error).message}`);
      this.client = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        /* ignore */
      }
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.client && !this.memoryFallback) {
      try {
        return await this.client.get(key);
      } catch {
        /* fall through */
      }
    }
    const cont = this.memory.continuations.get(key);
    if (!cont) return null;
    if (cont.expiresAt < Date.now()) {
      this.memory.continuations.delete(key);
      return null;
    }
    return JSON.stringify(cont);
  }

  async setex(key: string, ttlSec: number, value: string): Promise<void> {
    if (this.client && !this.memoryFallback) {
      try {
        await this.client.setex(key, ttlSec, value);
        return;
      } catch {
        /* fall through */
      }
    }
    const parsed = JSON.parse(value) as {
      userId: string;
      tripId: string;
      nonce: string;
      returnUri: string;
    };
    this.memory.continuations.set(key, {
      ...parsed,
      expiresAt: Date.now() + ttlSec * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.client && !this.memoryFallback) {
      try {
        await this.client.del(key);
        return;
      } catch {
        /* fall through */
      }
    }
    this.memory.continuations.delete(key);
  }

  /**
   * Sliding-window rate limit. Returns true if allowed.
   */
  allowRate(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const bucket = this.memory.rateBuckets.get(key) ?? [];
    const fresh = bucket.filter((t) => now - t < windowMs);
    if (fresh.length >= limit) {
      this.memory.rateBuckets.set(key, fresh);
      return false;
    }
    fresh.push(now);
    this.memory.rateBuckets.set(key, fresh);
    return true;
  }
}
