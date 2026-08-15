import { z } from 'zod';
import {
  ArrivalStatusSchema,
  GeoPointSchema,
  LocationSampleSchema,
  SharingStateSchema,
  TripStateSchema,
} from '../types/trip.js';
import { BadgeTypeSchema } from '../types/trip.js';
export const LineExchangeRequestSchema = z.object({
  idToken: z.string().min(1),
  nonce: z.string().optional(),
});
export type LineExchangeRequest = z.infer<typeof LineExchangeRequestSchema>;

export const AuthSessionResponseSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string(),
  locale: z.string().optional(),
  /** JWT — prefer accessToken for web clients */
  token: z.string().optional(),
  accessToken: z.string().optional(),
  expiresAt: z.string().datetime(),
  user: z
    .object({
      id: z.string().uuid(),
      displayName: z.string(),
      role: z.enum(['organizer', 'member', 'admin']),
    })
    .optional(),
});
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>;

export const CreateTripRequestSchema = z.object({
  clubId: z.string().uuid(),
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).optional(),
  timezone: z.string().default('Asia/Bangkok'),
  destination: GeoPointSchema,
  meetingPoint: GeoPointSchema.optional(),
  targetArrivalAt: z.string().datetime(),
  graceMinutes: z.number().int().min(0).max(180).default(15),
  cutoffAt: z.string().datetime(),
  capacity: z.number().int().min(1).max(200).default(30),
  publish: z.boolean().optional(),
});
export type CreateTripRequest = z.infer<typeof CreateTripRequestSchema>;

export const JoinTripRequestSchema = z.object({
  inviteToken: z.string().min(8),
  vehicleId: z.string().uuid().optional(),
  consentPolicyVersion: z.string().default('1.0.0'),
});
export type JoinTripRequest = z.infer<typeof JoinTripRequestSchema>;

/**
 * Body for POST /v1/trips/:id/sharing.
 * Required: `{ action: 'start' | 'pause' | 'stop' }`
 * Optional consent refs: `consentId` (UUID) and/or `consentVersion` (string; web sends this).
 */
export const SharingRequestSchema = z.object({
  action: z.enum(['start', 'pause', 'stop']),
  consentId: z.string().uuid().optional(),
  consentVersion: z.string().min(1).max(64).optional(),
});
export type SharingRequest = z.infer<typeof SharingRequestSchema>;

export const LocationsBatchRequestSchema = z.object({
  samples: z.array(LocationSampleSchema).min(1).max(50),
});
export type LocationsBatchRequest = z.infer<typeof LocationsBatchRequestSchema>;

export const ConfirmArrivalRequestSchema = z.object({
  action: z.enum(['confirm', 'dispute']),
  reason: z.string().max(500).optional(),
  arrivedAt: z.string().datetime().optional(),
});
export type ConfirmArrivalRequest = z.infer<typeof ConfirmArrivalRequestSchema>;

export const CloseTripRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type CloseTripRequest = z.infer<typeof CloseTripRequestSchema>;

export const ContinuationCreateRequestSchema = z.object({
  tripId: z.string().uuid(),
  returnUri: z.string().url(),
  nonce: z.string().min(8).max(128),
});
export type ContinuationCreateRequest = z.infer<
  typeof ContinuationCreateRequestSchema
>;

export const ContinuationRedeemRequestSchema = z.object({
  code: z.string().min(8),
  nonce: z.string().min(8).max(128),
});
export type ContinuationRedeemRequest = z.infer<
  typeof ContinuationRedeemRequestSchema
>;

export const TripSummarySchema = z.object({
  id: z.string().uuid(),
  clubId: z.string().uuid(),
  organizerId: z.string().uuid(),
  title: z.string(),
  state: TripStateSchema,
  timezone: z.string(),
  destination: GeoPointSchema,
  meetingPoint: GeoPointSchema.nullable().optional(),
  targetArrivalAt: z.string().datetime(),
  graceMinutes: z.number().int(),
  cutoffAt: z.string().datetime(),
  capacity: z.number().int(),
  ruleVersion: z.string(),
  notes: z.string().nullable().optional(),
  participantCount: z.number().int().optional(),
});
export type TripSummary = z.infer<typeof TripSummarySchema>;

export const ParticipantViewSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string(),
  role: z.string(),
  sharingState: SharingStateSchema,
  arrivalStatus: ArrivalStatusSchema,
  arrivedAt: z.string().datetime().nullable().optional(),
  freshness: z.string().optional(),
  vehicleNickname: z.string().nullable().optional(),
});
export type ParticipantView = z.infer<typeof ParticipantViewSchema>;

export const BadgeResultSchema = z.object({
  userId: z.string().uuid(),
  badgeType: BadgeTypeSchema,
  points: z.number().int(),
  reasonCode: z.string(),
  ruleVersion: z.string(),
  status: z.enum(['AWARDED', 'PENDING_REVIEW', 'REVOKED']),
});
export type BadgeResult = z.infer<typeof BadgeResultSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    correlationId: z.string().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
