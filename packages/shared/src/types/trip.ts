import { z } from 'zod';

export const TripStateSchema = z.enum([
  'DRAFT',
  'PUBLISHED',
  'OPEN',
  'CLOSED',
  'ARCHIVED',
  'CANCELLED',
]);
export type TripState = z.infer<typeof TripStateSchema>;

export const SharingStateSchema = z.enum([
  'OFF',
  'ACTIVE',
  'PAUSED',
  'STOPPED',
]);
export type SharingState = z.infer<typeof SharingStateSchema>;

export const FreshnessSchema = z.enum(['LIVE', 'DELAYED', 'STALE', 'OFFLINE']);
export type Freshness = z.infer<typeof FreshnessSchema>;

export const ParticipantRoleSchema = z.enum([
  'ORGANIZER',
  'DRIVER',
  'PASSENGER',
]);
export type ParticipantRole = z.infer<typeof ParticipantRoleSchema>;

export const ArrivalStatusSchema = z.enum([
  'NONE',
  'CANDIDATE',
  'CONFIRMED',
  'DISPUTED',
  'CORRECTED',
]);
export type ArrivalStatus = z.infer<typeof ArrivalStatusSchema>;

export const ClubMemberRoleSchema = z.enum([
  'OWNER',
  'ADMIN',
  'MEMBER',
]);
export type ClubMemberRole = z.infer<typeof ClubMemberRoleSchema>;

export const BadgeTypeSchema = z.enum([
  'EARLY_BIRD',
  'ON_TIME',
  'JUST_IN_TIME',
  'LATE_ARRIVAL',
  'RELIABLE_CRUISER',
  'ROAD_CAPTAIN',
  'SAFETY_FIRST',
]);
export type BadgeType = z.infer<typeof BadgeTypeSchema>;

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPointSchema>;

export const LocationSampleSchema = z.object({
  seq: z.number().int().nonnegative(),
  sampledAt: z.string().datetime(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().positive().optional(),
  headingDeg: z.number().min(0).max(360).optional(),
  speedMps: z.number().nonnegative().optional(),
});
export type LocationSampleInput = z.infer<typeof LocationSampleSchema>;

/** Freshness thresholds from spec (seconds). */
export const FRESHNESS_THRESHOLDS = {
  LIVE_MAX_S: 15,
  DELAYED_MAX_S: 60,
} as const;

export function computeFreshness(
  ageSeconds: number,
  sharingActive: boolean,
): Freshness {
  if (!sharingActive) return 'OFFLINE';
  if (ageSeconds <= FRESHNESS_THRESHOLDS.LIVE_MAX_S) return 'LIVE';
  if (ageSeconds <= FRESHNESS_THRESHOLDS.DELAYED_MAX_S) return 'DELAYED';
  return 'STALE';
}

/** Allowed trip state transitions. */
export const TRIP_TRANSITIONS: Record<TripState, readonly TripState[]> = {
  DRAFT: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['OPEN', 'CANCELLED'],
  OPEN: ['CLOSED', 'CANCELLED'],
  CLOSED: ['ARCHIVED'],
  ARCHIVED: [],
  CANCELLED: ['ARCHIVED'],
} as const;

export function canTransitionTrip(
  from: TripState,
  to: TripState,
): boolean {
  return (TRIP_TRANSITIONS[from] as readonly TripState[]).includes(to);
}
