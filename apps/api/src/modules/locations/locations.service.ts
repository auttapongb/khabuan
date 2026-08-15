import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  LocationsBatchRequest,
  computeFreshness,
} from '@mcg-convoy/shared';
import { MemoryStore } from '../../infrastructure/memory/memory.store';
import { RedisService } from '../../infrastructure/redis/redis.service';
import {
  isWithinGeofence,
  validateLocationSample,
} from './location-validation';
import { EtaService } from '../eta/eta.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class LocationsService {
  constructor(
    private readonly store: MemoryStore,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly eta: EtaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async ingestBatch(
    tripId: string,
    userId: string,
    dto: LocationsBatchRequest,
  ) {
    const trip = this.store.trips.get(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.state !== 'OPEN') {
      throw new BadRequestException('Location ingest only when trip is OPEN');
    }

    const participant = this.store.participants.get(`${tripId}:${userId}`);
    if (!participant) throw new ForbiddenException('Not a participant');
    if (participant.sharingState !== 'ACTIVE') {
      throw new BadRequestException('Sharing is not active');
    }

    if (!this.redis.allowRate(`loc:${tripId}:${userId}`, 30, 60_000)) {
      throw new BadRequestException('Location rate limit exceeded');
    }

    const current = this.store.locationCurrents.get(`${tripId}:${userId}`);
    let lastSeq = current?.seq ?? null;
    let lastSampledAt = current?.sampledAt ?? null;
    let lastPoint = current?.point ?? null;

    const results: {
      seq: number;
      accepted: boolean;
      reason?: string;
    }[] = [];

    const geofenceM = Number(
      this.config.get('ARRIVAL_GEOFENCE_METERS', 150),
    );
    const dwellSec = Number(this.config.get('ARRIVAL_DWELL_SECONDS', 60));
    const now = new Date();

    for (const sample of dto.samples) {
      const sampledAt = new Date(sample.sampledAt);
      const validation = validateLocationSample(
        {
          seq: sample.seq,
          sampledAt,
          lat: sample.lat,
          lng: sample.lng,
          accuracyM: sample.accuracyM,
        },
        {
          lastSeq,
          lastSampledAt,
          lastPoint,
          now,
        },
      );

      const sampleRecord = {
        id: randomUUID(),
        tripId,
        userId,
        seq: sample.seq,
        point: { lat: sample.lat, lng: sample.lng },
        accuracyM: sample.accuracyM ?? null,
        headingDeg: sample.headingDeg ?? null,
        speedMps: sample.speedMps ?? null,
        sampledAt,
        receivedAt: now,
        accepted: validation.accepted,
        rejectReason: validation.reason ?? null,
      };
      this.store.locationSamples.push(sampleRecord);

      if (!validation.accepted) {
        results.push({
          seq: sample.seq,
          accepted: false,
          reason: validation.reason,
        });
        continue;
      }

      lastSeq = sample.seq;
      lastSampledAt = sampledAt;
      lastPoint = { lat: sample.lat, lng: sample.lng };

      const age = (now.getTime() - sampledAt.getTime()) / 1000;
      const freshness = computeFreshness(age, true);

      const loc = {
        id: current?.id ?? randomUUID(),
        tripId,
        userId,
        point: { lat: sample.lat, lng: sample.lng },
        accuracyM: sample.accuracyM ?? null,
        headingDeg: sample.headingDeg ?? null,
        seq: sample.seq,
        sampledAt,
        receivedAt: now,
        freshness,
      };
      this.store.locationCurrents.set(`${tripId}:${userId}`, loc);

      // Arrival geofence + dwell
      if (
        participant.arrivalStatus === 'NONE' ||
        participant.arrivalStatus === 'CANDIDATE'
      ) {
        const inside = isWithinGeofence(
          loc.point,
          trip.destination,
          geofenceM,
        );
        const accuracyOk =
          sample.accuracyM === undefined || sample.accuracyM <= 50;
        if (inside && accuracyOk) {
          if (!participant.geofenceEnteredAt) {
            participant.geofenceEnteredAt = sampledAt;
          }
          const dwell =
            (sampledAt.getTime() -
              participant.geofenceEnteredAt.getTime()) /
            1000;
          if (dwell >= dwellSec && participant.arrivalStatus === 'NONE') {
            participant.arrivalStatus = 'CANDIDATE';
            participant.arrivedAt = participant.geofenceEnteredAt;
            participant.updatedAt = now;
            this.realtime.emitToTrip(tripId, 'participant:arrival', {
              userId,
              arrivalStatus: 'CANDIDATE',
              arrivedAt: participant.arrivedAt.toISOString(),
            });
          }
        } else {
          participant.geofenceEnteredAt = null;
        }
      }

      this.realtime.emitToTrip(tripId, 'location:update', {
        userId,
        point: loc.point,
        accuracyM: loc.accuracyM,
        headingDeg: loc.headingDeg,
        sampledAt: loc.sampledAt.toISOString(),
        freshness,
        // speed intentionally omitted from fan-out rewards path
      });

      const eta = await this.eta.calculateForParticipant(tripId, userId);
      if (eta) {
        this.realtime.emitToTrip(tripId, 'eta:update', eta);
      }

      results.push({ seq: sample.seq, accepted: true });
    }

    return { results };
  }

  listCurrent(tripId: string, userId: string) {
    const trip = this.store.trips.get(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    const participant = this.store.participants.get(`${tripId}:${userId}`);
    if (!participant) throw new ForbiddenException('Not a participant');

    const now = Date.now();
    const participants = [...this.store.participants.values()]
      .filter((p) => p.tripId === tripId)
      .map((p) => {
        const user = this.store.users.get(p.userId);
        const loc = this.store.locationCurrents.get(`${tripId}:${p.userId}`);
        const vehicle = p.vehicleId
          ? this.store.vehicles.get(p.vehicleId)
          : undefined;
        const ageSec = loc ? (now - loc.sampledAt.getTime()) / 1000 : Infinity;
        const freshness = computeFreshness(
          ageSec,
          p.sharingState === 'ACTIVE',
        );
        const eta = [...this.store.etaSnapshots]
          .reverse()
          .find((e) => e.tripId === tripId && e.userId === p.userId);

        return {
          userId: p.userId,
          displayName: user?.displayName ?? 'Unknown',
          sharingState: p.sharingState,
          freshness,
          lat: loc?.point.lat ?? null,
          lng: loc?.point.lng ?? null,
          accuracy: loc?.accuracyM ?? null,
          heading: loc?.headingDeg ?? null,
          sampledAt: loc?.sampledAt.toISOString() ?? null,
          etaMinutes:
            eta?.durationSec != null
              ? Math.round(eta.durationSec / 60)
              : null,
          vehicleColor: vehicle?.color ?? null,
          vehicleNickname: vehicle?.nickname ?? null,
        };
      });

    return { tripId, participants };
  }
}
