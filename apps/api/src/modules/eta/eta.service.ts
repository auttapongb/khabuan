import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { computeFreshness } from '@mcg-convoy/shared';
import { MemoryStore } from '../../infrastructure/memory/memory.store';
import { createEtaProvider, EtaProvider } from './eta-provider';

@Injectable()
export class EtaService {
  private readonly provider: EtaProvider;

  constructor(
    private readonly store: MemoryStore,
    private readonly config: ConfigService,
  ) {
    this.provider = createEtaProvider(
      this.config.get('ETA_PROVIDER', 'haversine'),
      this.config.get('OSRM_BASE_URL'),
    );
  }

  async calculateForParticipant(tripId: string, userId: string) {
    const trip = this.store.trips.get(tripId);
    const loc = this.store.locationCurrents.get(`${tripId}:${userId}`);
    if (!trip || !loc) return null;

    const age = (Date.now() - loc.sampledAt.getTime()) / 1000;
    const freshness = computeFreshness(age, true);
    if (freshness === 'STALE') {
      const last = [...this.store.etaSnapshots]
        .reverse()
        .find((e) => e.tripId === tripId && e.userId === userId);
      if (last) {
        return {
          userId,
          provider: last.provider,
          etaAt: last.etaAt?.toISOString() ?? null,
          durationSec: last.durationSec,
          distanceM: last.distanceM,
          confidence: last.confidence,
          stale: true,
          calculatedAt: last.calculatedAt.toISOString(),
        };
      }
      return {
        userId,
        provider: this.provider.name,
        etaAt: null,
        durationSec: null,
        distanceM: null,
        confidence: 'unavailable',
        stale: true,
        calculatedAt: new Date().toISOString(),
      };
    }

    const result = await this.provider.calculate({
      origin: loc.point,
      destination: trip.destination,
    });

    const snap = {
      id: randomUUID(),
      tripId,
      userId,
      provider: result.provider,
      etaAt: result.etaAt,
      durationSec: result.durationSec,
      distanceM: result.distanceM,
      confidence: result.confidence,
      routeVersion: null,
      stale: result.stale,
      calculatedAt: new Date(),
    };
    this.store.etaSnapshots.push(snap);

    return {
      userId,
      provider: snap.provider,
      etaAt: snap.etaAt?.toISOString() ?? null,
      durationSec: snap.durationSec,
      distanceM: snap.distanceM,
      confidence: snap.confidence,
      stale: snap.stale,
      calculatedAt: snap.calculatedAt.toISOString(),
    };
  }
}
