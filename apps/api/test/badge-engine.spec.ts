import { describe, expect, it } from 'vitest';
import {
  classifyArrivalWindow,
  computeTripBadges,
  dedupeAwards,
  assertTripTransition,
  TripStateError,
} from '../src/modules/badges/badge-engine';
import { canTransitionTrip } from '@mcg-convoy/shared';

describe('trip state machine', () => {
  it('allows DRAFT -> PUBLISHED -> OPEN -> CLOSED -> ARCHIVED', () => {
    expect(canTransitionTrip('DRAFT', 'PUBLISHED')).toBe(true);
    expect(canTransitionTrip('PUBLISHED', 'OPEN')).toBe(true);
    expect(canTransitionTrip('OPEN', 'CLOSED')).toBe(true);
    expect(canTransitionTrip('CLOSED', 'ARCHIVED')).toBe(true);
  });

  it('rejects illegal transitions', () => {
    expect(canTransitionTrip('DRAFT', 'OPEN')).toBe(false);
    expect(canTransitionTrip('ARCHIVED', 'OPEN')).toBe(false);
    expect(() => assertTripTransition('CLOSED', 'OPEN')).toThrow(TripStateError);
  });
});

describe('badge engine', () => {
  const target = new Date('2026-08-15T12:00:00.000Z');
  const graceMinutes = 15;
  const cutoff = new Date('2026-08-15T13:00:00.000Z');

  it('classifies arrival windows without speed', () => {
    expect(
      classifyArrivalWindow({
        arrivedAt: new Date('2026-08-15T11:40:00.000Z'),
        targetArrivalAt: target,
        graceMinutes,
        cutoffAt: cutoff,
      }),
    ).toBe('EARLY_BIRD');

    expect(
      classifyArrivalWindow({
        arrivedAt: new Date('2026-08-15T11:55:00.000Z'),
        targetArrivalAt: target,
        graceMinutes,
        cutoffAt: cutoff,
      }),
    ).toBe('ON_TIME');

    expect(
      classifyArrivalWindow({
        arrivedAt: new Date('2026-08-15T12:12:00.000Z'),
        targetArrivalAt: target,
        graceMinutes,
        cutoffAt: cutoff,
      }),
    ).toBe('JUST_IN_TIME');

    expect(
      classifyArrivalWindow({
        arrivedAt: new Date('2026-08-15T12:30:00.000Z'),
        targetArrivalAt: target,
        graceMinutes,
        cutoffAt: cutoff,
      }),
    ).toBe('LATE');
  });

  it('awards On Time + Safety First idempotently', () => {
    const awards = computeTripBadges({
      tripId: '44444444-4444-4444-8444-444444444444',
      targetArrivalAt: target,
      graceMinutes,
      cutoffAt: cutoff,
      ruleVersion: '1.0.0',
      participants: [
        {
          userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          isOrganizer: false,
          isTestAccount: false,
          arrivedAt: new Date('2026-08-15T11:55:00.000Z'),
          arrivalStatus: 'CONFIRMED',
          sharingEndedCleanly: true,
          consecutiveOnTimeCount: 0,
        },
      ],
    });

    const types = awards.map((a) => a.badgeType).sort();
    expect(types).toContain('ON_TIME');
    expect(types).toContain('SAFETY_FIRST');
    expect(awards.every((a) => a.points > 0)).toBe(true);

    const again = computeTripBadges({
      tripId: '44444444-4444-4444-8444-444444444444',
      targetArrivalAt: target,
      graceMinutes,
      cutoffAt: cutoff,
      ruleVersion: '1.0.0',
      participants: [
        {
          userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          isOrganizer: false,
          isTestAccount: false,
          arrivedAt: new Date('2026-08-15T11:55:00.000Z'),
          arrivalStatus: 'CONFIRMED',
          sharingEndedCleanly: true,
          consecutiveOnTimeCount: 0,
        },
      ],
    });
    expect(dedupeAwards([...awards, ...again])).toHaveLength(awards.length);
  });

  it('never invents speed-based badges', () => {
    const awards = computeTripBadges({
      tripId: '44444444-4444-4444-8444-444444444444',
      targetArrivalAt: target,
      graceMinutes,
      cutoffAt: cutoff,
      ruleVersion: '1.0.0',
      participants: [],
    });
    expect(awards).toEqual([]);
  });

  it('awards Road Captain when >=80% arrive', () => {
    const mk = (id: string, arrived: boolean, isOrganizer = false) => ({
      userId: id,
      isOrganizer,
      isTestAccount: false,
      arrivedAt: arrived ? new Date('2026-08-15T11:55:00.000Z') : null,
      arrivalStatus: arrived
        ? ('CONFIRMED' as const)
        : ('NONE' as const),
      sharingEndedCleanly: arrived,
      consecutiveOnTimeCount: 0,
    });
    const awards = computeTripBadges({
      tripId: '44444444-4444-4444-8444-444444444444',
      targetArrivalAt: target,
      graceMinutes,
      cutoffAt: cutoff,
      ruleVersion: '1.0.0',
      participants: [
        mk('00000000-0000-4000-8000-000000000001', true, true),
        mk('00000000-0000-4000-8000-000000000002', true),
        mk('00000000-0000-4000-8000-000000000003', true),
        mk('00000000-0000-4000-8000-000000000004', true),
        mk('00000000-0000-4000-8000-000000000005', false),
      ],
    });
    expect(awards.some((a) => a.badgeType === 'ROAD_CAPTAIN')).toBe(true);
  });
});
