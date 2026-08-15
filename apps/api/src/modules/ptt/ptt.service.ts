import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'node:crypto';
import { MemoryStore } from '../../infrastructure/memory/memory.store';

/**
 * Push-to-talk scaffold.
 *
 * Chosen SFU for production: LiveKit (managed WebRTC rooms, trip-scoped tokens).
 * This module issues mock LiveKit-style JWTs when PTT_ENABLED=true for client wiring;
 * real LiveKit API key/secret integration lands in a later phase.
 */
@Injectable()
export class PttService {
  /** tripId → current floor holder userId */
  private floors = new Map<string, string>();

  constructor(
    private readonly config: ConfigService,
    private readonly store: MemoryStore,
  ) {}

  private assertEnabled(): void {
    if (this.config.get<string>('PTT_ENABLED', 'false') !== 'true') {
      throw new HttpException(
        {
          error: 'PTT_DISABLED',
          message:
            'Push-to-talk is feature-flagged off. Set PTT_ENABLED=true (LiveKit SFU).',
        },
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
  }

  private requireParticipant(tripId: string, userId: string): void {
    const trip = this.store.trips.get(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    const p = this.store.participants.get(`${tripId}:${userId}`);
    if (!p) throw new ForbiddenException('Not a trip participant');
  }

  issueToken(tripId: string, userId: string) {
    this.assertEnabled();
    this.requireParticipant(tripId, userId);

    const identity = userId;
    const roomName = `trip-${tripId}`;
    // Mock LiveKit-style access token (not a real signed LiveKit JWT)
    const mockJwt = [
      Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      ),
      Buffer.from(
        JSON.stringify({
          iss: 'mcg-convoy-demo',
          sub: identity,
          video: {
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
          },
          exp: Math.floor(Date.now() / 1000) + 3600,
          jti: randomUUID(),
        }),
      ).toString('base64url'),
      randomBytes(16).toString('base64url'),
    ].join('.');

    return {
      provider: 'livekit',
      /** LiveKit is the chosen SFU for MCG Convoy PTT. */
      sfu: 'livekit',
      token: mockJwt,
      identity,
      roomName,
      url: this.config.get('LIVEKIT_URL', 'wss://livekit.example.local'),
      expiresInSec: 3600,
    };
  }

  holdFloor(tripId: string, userId: string) {
    this.assertEnabled();
    this.requireParticipant(tripId, userId);
    const current = this.floors.get(tripId);
    if (current && current !== userId) {
      throw new ForbiddenException('Floor held by another participant');
    }
    this.floors.set(tripId, userId);
    return { tripId, floorHolderId: userId, held: true };
  }

  releaseFloor(tripId: string, userId: string) {
    this.assertEnabled();
    this.requireParticipant(tripId, userId);
    const current = this.floors.get(tripId);
    if (current === userId) {
      this.floors.delete(tripId);
    }
    return { tripId, floorHolderId: null, held: false };
  }
}
