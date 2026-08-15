import {
  BadgeType,
  BADGE_RULE_VERSION,
  BADGE_RULES_V1,
  canTransitionTrip,
  TripState,
} from '@mcg-convoy/shared';
import { createHash } from 'node:crypto';

export { canTransitionTrip };

export class TripStateError extends Error {
  constructor(
    public readonly from: TripState,
    public readonly to: TripState,
  ) {
    super(`Invalid trip transition ${from} -> ${to}`);
    this.name = 'TripStateError';
  }
}

export function assertTripTransition(from: TripState, to: TripState): void {
  if (!canTransitionTrip(from, to)) {
    throw new TripStateError(from, to);
  }
}

export function sharingAllowed(state: TripState): boolean {
  return state === 'OPEN';
}

export function joinAllowed(state: TripState): boolean {
  return state === 'PUBLISHED' || state === 'OPEN';
}

export interface ArrivalTimingInput {
  arrivedAt: Date;
  targetArrivalAt: Date;
  graceMinutes: number;
  cutoffAt: Date;
}

export type ArrivalWindow =
  | 'TOO_EARLY'
  | 'EARLY_BIRD'
  | 'ON_TIME'
  | 'JUST_IN_TIME'
  | 'LATE'
  | 'AFTER_CUTOFF';

export function classifyArrivalWindow(input: ArrivalTimingInput): ArrivalWindow {
  const { arrivedAt, targetArrivalAt, graceMinutes, cutoffAt } = input;
  if (arrivedAt > cutoffAt) return 'AFTER_CUTOFF';

  const earlyMs = targetArrivalAt.getTime() - arrivedAt.getTime();
  const earlyMin = earlyMs / 60_000;
  const graceEnd = new Date(
    targetArrivalAt.getTime() + graceMinutes * 60_000,
  );

  if (earlyMin > 30) return 'TOO_EARLY';
  if (earlyMin >= 10 && earlyMin <= 30) return 'EARLY_BIRD';
  if (arrivedAt <= graceEnd) {
    const remainingGraceMin =
      (graceEnd.getTime() - arrivedAt.getTime()) / 60_000;
    if (remainingGraceMin <= 5 && arrivedAt > targetArrivalAt) {
      return 'JUST_IN_TIME';
    }
    // On time: from 10 min early through grace end (overlaps early bird band for 10-30)
    if (earlyMin < 10) return 'ON_TIME';
    return 'EARLY_BIRD';
  }
  return 'LATE';
}

export interface ParticipantScoreInput {
  userId: string;
  isOrganizer: boolean;
  isTestAccount: boolean;
  arrivedAt: Date | null;
  arrivalStatus: 'NONE' | 'CANDIDATE' | 'CONFIRMED' | 'DISPUTED' | 'CORRECTED';
  sharingEndedCleanly: boolean;
  consecutiveOnTimeCount: number;
}

export interface TripScoreContext {
  tripId: string;
  targetArrivalAt: Date;
  graceMinutes: number;
  cutoffAt: Date;
  ruleVersion: string;
  participants: ParticipantScoreInput[];
}

export interface ComputedBadge {
  userId: string;
  badgeType: BadgeType;
  points: number;
  reasonCode: string;
  inputHash: string;
  ruleVersion: string;
}

function pointsFor(type: BadgeType): number {
  return BADGE_RULES_V1.find((r) => r.type === type)?.points ?? 0;
}

function hashInputs(parts: Record<string, unknown>): string {
  return createHash('sha256')
    .update(JSON.stringify(parts))
    .digest('hex')
    .slice(0, 32);
}

/**
 * Idempotent badge engine. Never uses speed or "beat ETA" signals.
 */
export function computeTripBadges(ctx: TripScoreContext): ComputedBadge[] {
  const version = ctx.ruleVersion || BADGE_RULE_VERSION;
  const awards: ComputedBadge[] = [];
  const eligible = ctx.participants.filter(
    (p) =>
      !p.isTestAccount &&
      (p.arrivalStatus === 'CONFIRMED' || p.arrivalStatus === 'CORRECTED') &&
      p.arrivedAt,
  );

  const arrivedCount = eligible.length;
  const totalMembers = ctx.participants.filter((p) => !p.isTestAccount).length;
  const arrivalRate = totalMembers > 0 ? arrivedCount / totalMembers : 0;

  for (const p of eligible) {
    if (!p.arrivedAt) continue;
    const window = classifyArrivalWindow({
      arrivedAt: p.arrivedAt,
      targetArrivalAt: ctx.targetArrivalAt,
      graceMinutes: ctx.graceMinutes,
      cutoffAt: ctx.cutoffAt,
    });

    const baseHash = {
      tripId: ctx.tripId,
      userId: p.userId,
      arrivedAt: p.arrivedAt.toISOString(),
      target: ctx.targetArrivalAt.toISOString(),
      grace: ctx.graceMinutes,
      version,
    };

    if (window === 'EARLY_BIRD') {
      awards.push({
        userId: p.userId,
        badgeType: 'EARLY_BIRD',
        points: pointsFor('EARLY_BIRD'),
        reasonCode: 'ARRIVAL_EARLY_BIRD_WINDOW',
        inputHash: hashInputs({ ...baseHash, badge: 'EARLY_BIRD' }),
        ruleVersion: version,
      });
    } else if (window === 'ON_TIME') {
      awards.push({
        userId: p.userId,
        badgeType: 'ON_TIME',
        points: pointsFor('ON_TIME'),
        reasonCode: 'ARRIVAL_ON_TIME_WINDOW',
        inputHash: hashInputs({ ...baseHash, badge: 'ON_TIME' }),
        ruleVersion: version,
      });
    } else if (window === 'JUST_IN_TIME') {
      awards.push({
        userId: p.userId,
        badgeType: 'JUST_IN_TIME',
        points: pointsFor('JUST_IN_TIME'),
        reasonCode: 'ARRIVAL_JUST_IN_TIME_WINDOW',
        inputHash: hashInputs({ ...baseHash, badge: 'JUST_IN_TIME' }),
        ruleVersion: version,
      });
    } else if (window === 'LATE') {
      awards.push({
        userId: p.userId,
        badgeType: 'LATE_ARRIVAL',
        points: pointsFor('LATE_ARRIVAL'),
        reasonCode: 'ARRIVAL_LATE_PRIVATE',
        inputHash: hashInputs({ ...baseHash, badge: 'LATE_ARRIVAL' }),
        ruleVersion: version,
      });
    }

    if (p.sharingEndedCleanly && p.arrivalStatus === 'CONFIRMED') {
      awards.push({
        userId: p.userId,
        badgeType: 'SAFETY_FIRST',
        points: pointsFor('SAFETY_FIRST'),
        reasonCode: 'SHARING_STOPPED_AND_ARRIVAL_CONFIRMED',
        inputHash: hashInputs({ ...baseHash, badge: 'SAFETY_FIRST' }),
        ruleVersion: version,
      });
    }

    if (
      (window === 'ON_TIME' || window === 'JUST_IN_TIME' || window === 'EARLY_BIRD') &&
      p.consecutiveOnTimeCount + 1 >= 3
    ) {
      awards.push({
        userId: p.userId,
        badgeType: 'RELIABLE_CRUISER',
        points: pointsFor('RELIABLE_CRUISER'),
        reasonCode: 'THREE_CONSECUTIVE_ON_TIME',
        inputHash: hashInputs({
          ...baseHash,
          badge: 'RELIABLE_CRUISER',
          streak: p.consecutiveOnTimeCount + 1,
        }),
        ruleVersion: version,
      });
    }
  }

  if (arrivalRate >= 0.8) {
    const organizer = ctx.participants.find((p) => p.isOrganizer && !p.isTestAccount);
    if (organizer) {
      awards.push({
        userId: organizer.userId,
        badgeType: 'ROAD_CAPTAIN',
        points: pointsFor('ROAD_CAPTAIN'),
        reasonCode: 'TRIP_ARRIVAL_RATE_GE_80',
        inputHash: hashInputs({
          tripId: ctx.tripId,
          userId: organizer.userId,
          badge: 'ROAD_CAPTAIN',
          arrivalRate,
          version,
        }),
        ruleVersion: version,
      });
    }
  }

  return awards;
}

/**
 * Merge awards idempotently by (userId, badgeType, ruleVersion).
 */
export function dedupeAwards(awards: ComputedBadge[]): ComputedBadge[] {
  const map = new Map<string, ComputedBadge>();
  for (const a of awards) {
    const key = `${a.userId}:${a.badgeType}:${a.ruleVersion}`;
    if (!map.has(key)) map.set(key, a);
  }
  return [...map.values()];
}
