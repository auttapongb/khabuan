import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { MemoryStore } from '../../infrastructure/memory/memory.store';

const TTL_SEC = 120;
const KEY_PREFIX = 'cont:';

@Injectable()
export class ContinuationsService {
  constructor(
    private readonly redis: RedisService,
    private readonly store: MemoryStore,
  ) {}

  async create(
    userId: string,
    tripId: string,
    returnUri: string,
    nonce: string,
  ) {
    const participant = this.store.participants.get(`${tripId}:${userId}`);
    if (!participant) {
      throw new UnauthorizedException('Must be trip participant');
    }
    const code = randomBytes(24).toString('base64url');
    const payload = JSON.stringify({
      userId,
      tripId,
      nonce,
      returnUri,
    });
    await this.redis.setex(`${KEY_PREFIX}${code}`, TTL_SEC, payload);
    return {
      code,
      expiresInSec: TTL_SEC,
      returnUri,
    };
  }

  async redeem(userId: string, code: string, nonce: string) {
    const key = `${KEY_PREFIX}${code}`;
    const raw = await this.redis.get(key);
    if (!raw) throw new BadRequestException('Invalid or expired continuation');
    await this.redis.del(key);

    const data = JSON.parse(raw) as {
      userId: string;
      tripId: string;
      nonce: string;
      returnUri: string;
      expiresAt?: number;
    };

    if (data.expiresAt && data.expiresAt < Date.now()) {
      throw new BadRequestException('Continuation expired');
    }
    if (data.userId !== userId || data.nonce !== nonce) {
      throw new UnauthorizedException('Continuation identity mismatch');
    }

    return {
      tripId: data.tripId,
      returnUri: data.returnUri,
    };
  }
}
