import {
  ArrivalStatus,
  BadgeType,
  ClubMemberRole,
  GeoPoint,
  ParticipantRole,
  SharingState,
  TripState,
} from '@mcg-convoy/shared';

export interface GeoPointJson {
  lat: number;
  lng: number;
}

export interface UserRecord {
  id: string;
  lineSubject: string | null;
  displayName: string;
  status: 'ACTIVE' | 'RESTRICTED' | 'DELETED';
  locale: string;
  isAdmin: boolean;
  isTestAccount: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClubRecord {
  id: string;
  tenantId: string;
  name: string;
  visibility: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClubMemberRecord {
  id: string;
  clubId: string;
  userId: string;
  role: ClubMemberRole;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'LEFT';
  joinedAt: Date;
}

export interface VehicleIconAssetRecord {
  id: string;
  slug: string;
  label: string;
  svgPath: string | null;
  rightsNotes: string | null;
  active: boolean;
  createdAt: Date;
}

export interface VehicleRecord {
  id: string;
  userId: string;
  nickname: string;
  class: string;
  color: string;
  iconAssetId: string | null;
  plateAlias: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripRecord {
  id: string;
  clubId: string;
  organizerId: string;
  title: string;
  state: TripState;
  destination: GeoPointJson;
  meetingPoint: GeoPointJson | null;
  routeGeometry: unknown | null;
  /** LINE group id the นำขบวน bot is a member of, once bound. */
  lineGroupId: string | null;
  timezone: string;
  targetArrivalAt: Date;
  graceMinutes: number;
  cutoffAt: Date;
  capacity: number;
  ruleVersion: string;
  notes: string | null;
  cancelReason: string | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripParticipantRecord {
  id: string;
  tripId: string;
  userId: string;
  vehicleId: string | null;
  role: ParticipantRole;
  sharingState: SharingState;
  arrivalStatus: ArrivalStatus;
  arrivedAt: Date | null;
  visibility: string;
  joinedAt: Date;
  updatedAt: Date;
  geofenceEnteredAt: Date | null;
}

export interface InviteRecord {
  id: string;
  tripId: string;
  tokenHash: string;
  tokenHint: string;
  expiresAt: Date;
  maxUses: number;
  useCount: number;
  boundGroupId: string | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface LocationCurrentRecord {
  id: string;
  tripId: string;
  userId: string;
  point: GeoPointJson;
  accuracyM: number | null;
  headingDeg: number | null;
  seq: number;
  sampledAt: Date;
  receivedAt: Date;
  freshness: string;
}

export interface LocationSampleRecord {
  id: string;
  tripId: string;
  userId: string;
  seq: number;
  point: GeoPointJson;
  accuracyM: number | null;
  headingDeg: number | null;
  speedMps: number | null;
  sampledAt: Date;
  receivedAt: Date;
  accepted: boolean;
  rejectReason: string | null;
}

export interface EtaSnapshotRecord {
  id: string;
  tripId: string;
  userId: string;
  provider: string;
  etaAt: Date | null;
  durationSec: number | null;
  distanceM: number | null;
  confidence: string;
  routeVersion: string | null;
  stale: boolean;
  calculatedAt: Date;
}

export interface BadgeAwardRecord {
  id: string;
  tripId: string;
  userId: string;
  badgeType: BadgeType;
  ruleVersion: string;
  points: number;
  reasonCode: string;
  inputHash: string;
  status: 'AWARDED' | 'PENDING_REVIEW' | 'REVOKED';
  createdAt: Date;
}

export interface ConsentRecordRow {
  id: string;
  userId: string;
  purpose: string;
  policyVersion: string;
  grantedAt: Date;
  revokedAt: Date | null;
  tripId: string | null;
}

export interface AuditEventRecord {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  result: string;
  reason: string | null;
  correlationId: string | null;
  metadata: unknown;
  createdAt: Date;
}

export type GeoPointLike = GeoPoint | GeoPointJson;
