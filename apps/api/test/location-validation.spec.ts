import { describe, expect, it } from 'vitest';
import {
  haversineMeters,
  validateLocationSample,
  isWithinGeofence,
} from '../src/modules/locations/location-validation';
import { computeFreshness } from '@mcg-convoy/shared';

describe('location validation', () => {
  const now = new Date('2026-08-15T12:00:00.000Z');

  it('accepts first sample', () => {
    const r = validateLocationSample(
      {
        seq: 1,
        sampledAt: new Date('2026-08-15T11:59:55.000Z'),
        lat: 13.75,
        lng: 100.5,
      },
      { lastSeq: null, lastSampledAt: null, lastPoint: null, now },
    );
    expect(r.accepted).toBe(true);
  });

  it('rejects stale sequence', () => {
    const r = validateLocationSample(
      {
        seq: 1,
        sampledAt: new Date('2026-08-15T11:59:56.000Z'),
        lat: 13.75,
        lng: 100.5,
      },
      {
        lastSeq: 2,
        lastSampledAt: new Date('2026-08-15T11:59:50.000Z'),
        lastPoint: { lat: 13.75, lng: 100.5 },
        now,
      },
    );
    expect(r).toEqual({ accepted: false, reason: 'STALE_SEQUENCE' });
  });

  it('rejects impossible jumps (validation only — not scoring)', () => {
    const r = validateLocationSample(
      {
        seq: 2,
        sampledAt: new Date('2026-08-15T11:59:56.000Z'),
        lat: 14.75,
        lng: 101.5,
      },
      {
        lastSeq: 1,
        lastSampledAt: new Date('2026-08-15T11:59:55.000Z'),
        lastPoint: { lat: 13.75, lng: 100.5 },
        now,
      },
    );
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('IMPOSSIBLE_JUMP');
  });

  it('labels freshness Live / Delayed / Stale', () => {
    expect(computeFreshness(30, true)).toBe('LIVE');
    expect(computeFreshness(120, true)).toBe('DELAYED');
    expect(computeFreshness(400, true)).toBe('STALE');
    expect(computeFreshness(5, false)).toBe('OFFLINE');
  });

  it('geofence 150m dwell candidate geometry', () => {
    const dest = { lat: 13.746, lng: 100.538 };
    expect(isWithinGeofence({ lat: 13.7461, lng: 100.5381 }, dest, 150)).toBe(
      true,
    );
    expect(haversineMeters(dest, { lat: 13.75, lng: 100.55 })).toBeGreaterThan(
      150,
    );
  });
});
