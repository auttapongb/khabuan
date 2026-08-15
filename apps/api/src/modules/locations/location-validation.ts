import { GeoPoint } from '@mcg-convoy/shared';

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface LocationValidationContext {
  lastSeq: number | null;
  lastSampledAt: Date | null;
  lastPoint: GeoPoint | null;
  now: Date;
  /** Max plausible speed m/s (~200 km/h) for jump detection — validation only, NOT scoring. */
  maxSpeedMps?: number;
  maxSampleAgeMs?: number;
}

export interface LocationSampleCandidate {
  seq: number;
  sampledAt: Date;
  lat: number;
  lng: number;
  accuracyM?: number;
}

export type LocationRejectReason =
  | 'STALE_SEQUENCE'
  | 'STALE_TIMESTAMP'
  | 'IMPOSSIBLE_JUMP'
  | 'FUTURE_TIMESTAMP'
  | 'TOO_OLD'
  | 'INVALID_COORDS';

export interface LocationValidationResult {
  accepted: boolean;
  reason?: LocationRejectReason;
}

/**
 * Validate a location sample. Speed is used only to reject impossible jumps —
 * never for badges or rewards.
 */
export function validateLocationSample(
  sample: LocationSampleCandidate,
  ctx: LocationValidationContext,
): LocationValidationResult {
  if (
    !Number.isFinite(sample.lat) ||
    !Number.isFinite(sample.lng) ||
    sample.lat < -90 ||
    sample.lat > 90 ||
    sample.lng < -180 ||
    sample.lng > 180
  ) {
    return { accepted: false, reason: 'INVALID_COORDS' };
  }

  if (ctx.lastSeq !== null && sample.seq <= ctx.lastSeq) {
    return { accepted: false, reason: 'STALE_SEQUENCE' };
  }

  if (ctx.lastSampledAt && sample.sampledAt <= ctx.lastSampledAt) {
    return { accepted: false, reason: 'STALE_TIMESTAMP' };
  }

  const skewMs = sample.sampledAt.getTime() - ctx.now.getTime();
  if (skewMs > 30_000) {
    return { accepted: false, reason: 'FUTURE_TIMESTAMP' };
  }

  const maxAge = ctx.maxSampleAgeMs ?? 5 * 60_000;
  if (ctx.now.getTime() - sample.sampledAt.getTime() > maxAge) {
    return { accepted: false, reason: 'TOO_OLD' };
  }

  if (ctx.lastPoint && ctx.lastSampledAt) {
    const dtSec =
      (sample.sampledAt.getTime() - ctx.lastSampledAt.getTime()) / 1000;
    if (dtSec > 0) {
      const dist = haversineMeters(ctx.lastPoint, {
        lat: sample.lat,
        lng: sample.lng,
      });
      const speed = dist / dtSec;
      const maxSpeed = ctx.maxSpeedMps ?? 55.5; // ~200 km/h
      if (speed > maxSpeed && dist > 500) {
        return { accepted: false, reason: 'IMPOSSIBLE_JUMP' };
      }
    }
  }

  return { accepted: true };
}

export function isWithinGeofence(
  point: GeoPoint,
  destination: GeoPoint,
  radiusM: number,
): boolean {
  return haversineMeters(point, destination) <= radiusM;
}
