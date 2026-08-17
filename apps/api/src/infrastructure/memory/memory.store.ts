import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  BADGE_RULE_VERSION,
  ClubMemberRole,
} from '@mcg-convoy/shared';
import {
  AuditEventRecord,
  BadgeAwardRecord,
  ClubMemberRecord,
  ClubRecord,
  ConsentRecordRow,
  EtaSnapshotRecord,
  InviteRecord,
  LocationCurrentRecord,
  LocationSampleRecord,
  TripParticipantRecord,
  TripRecord,
  UserRecord,
  VehicleIconAssetRecord,
  VehicleRecord,
} from './types';

@Injectable()
export class MemoryStore implements OnModuleInit {
  users = new Map<string, UserRecord>();
  clubs = new Map<string, ClubRecord>();
  clubMembers = new Map<string, ClubMemberRecord>();
  vehicleIcons = new Map<string, VehicleIconAssetRecord>();
  vehicles = new Map<string, VehicleRecord>();
  trips = new Map<string, TripRecord>();
  participants = new Map<string, TripParticipantRecord>();
  invites = new Map<string, InviteRecord>();
  /** tokenHash -> inviteId */
  inviteByHash = new Map<string, string>();
  locationCurrents = new Map<string, LocationCurrentRecord>();
  locationSamples: LocationSampleRecord[] = [];
  etaSnapshots: EtaSnapshotRecord[] = [];
  badgeAwards = new Map<string, BadgeAwardRecord>();
  consents: ConsentRecordRow[] = [];
  auditEvents: AuditEventRecord[] = [];
  /** continuation code -> payload */
  continuations = new Map<
    string,
    { userId: string; tripId: string; nonce: string; returnUri: string; expiresAt: number }
  >();
  /** rate limit key -> timestamps */
  rateBuckets = new Map<string, number[]>();

  demoInviteToken = '';
  /** Short aliases → canonical invite token (e.g. demo-invite-mcg) */
  demoInviteAliases = new Map<string, string>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (this.config.get<string>('PERSISTENCE_MODE', 'memory') === 'memory') {
      this.seedDemo();
    }
  }

  /** Resolve invite token or known demo alias to SHA-256 hash. */
  resolveInviteTokenHash(tokenOrAlias: string): string {
    const canonical =
      this.demoInviteAliases.get(tokenOrAlias) ?? tokenOrAlias;
    return hashToken(canonical);
  }

  seedDemo(): void {
    const now = new Date();
    const organizerId = '11111111-1111-4111-8111-111111111111';
    const memberId = '22222222-2222-4222-8222-222222222222';
    const clubId = '33333333-3333-4333-8333-333333333333';
    const tripId = '44444444-4444-4444-8444-444444444444';
    const iconSedan = '55555555-5555-4555-8555-555555555551';
    const iconCoupe = '55555555-5555-4555-8555-555555555552';
    const iconSuv = '55555555-5555-4555-8555-555555555553';
    const vehicleId = '66666666-6666-4666-8666-666666666666';

    this.users.set(organizerId, {
      id: organizerId,
      lineSubject: 'demo-organizer',
      displayName: 'Demo Organizer',
      status: 'ACTIVE',
      locale: 'en',
      isAdmin: true,
      isTestAccount: true,
      createdAt: now,
      updatedAt: now,
    });
    this.users.set(memberId, {
      id: memberId,
      lineSubject: 'demo-member',
      displayName: 'Demo Member',
      status: 'ACTIVE',
      locale: 'en',
      isAdmin: false,
      isTestAccount: true,
      createdAt: now,
      updatedAt: now,
    });

    this.clubs.set(clubId, {
      id: clubId,
      tenantId: 'mcg',
      name: 'MCG Demo Club',
      visibility: 'private',
      ownerId: organizerId,
      createdAt: now,
      updatedAt: now,
    });

    this.addMember(clubId, organizerId, 'OWNER');
    this.addMember(clubId, memberId, 'MEMBER');

    for (const [id, slug, label] of [
      [iconSedan, 'generic-sedan', 'Generic Sedan'],
      [iconCoupe, 'generic-coupe', 'Generic Coupe'],
      [iconSuv, 'generic-suv', 'Generic SUV'],
    ] as const) {
      this.vehicleIcons.set(id, {
        id,
        slug,
        label,
        svgPath: `/assets/vehicles/${slug}.svg`,
        rightsNotes: 'Generic silhouette — no manufacturer marks',
        active: true,
        createdAt: now,
      });
    }

    this.vehicles.set(vehicleId, {
      id: vehicleId,
      userId: organizerId,
      nickname: 'Midnight GT',
      class: 'coupe',
      color: '#111111',
      iconAssetId: iconCoupe,
      plateAlias: null,
      createdAt: now,
      updatedAt: now,
    });

    const target = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const cutoff = new Date(target.getTime() + 45 * 60 * 1000);

    this.trips.set(tripId, {
      id: tripId,
      code: null,
      clubId,
      organizerId,
      title: 'Bangkok Sunset Convoy',
      // OPEN so demos can start sharing immediately without an extra open call
      state: 'OPEN',
      destination: { lat: 13.746, lng: 100.538 },
      meetingPoint: { lat: 13.7563, lng: 100.5018 },
      routeGeometry: null,
      lineGroupId: null,
      timezone: 'Asia/Bangkok',
      targetArrivalAt: target,
      graceMinutes: 15,
      cutoffAt: cutoff,
      capacity: 30,
      ruleVersion: BADGE_RULE_VERSION,
      notes: 'Mandarin Oriental Bangkok — valet on Oriental Avenue. Drive safely.',
      cancelReason: null,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    this.participants.set(`${tripId}:${organizerId}`, {
      id: randomUUID(),
      tripId,
      userId: organizerId,
      vehicleId,
      role: 'ORGANIZER',
      sharingState: 'OFF',
      arrivalStatus: 'NONE',
      arrivedAt: null,
      visibility: 'exact',
      joinedAt: now,
      updatedAt: now,
      geofenceEnteredAt: null,
    });

    const rawToken = 'demo-invite-token-mcg-convoy';
    const aliasToken = 'demo-invite-mcg';
    this.demoInviteToken = rawToken;
    this.demoInviteAliases.set(aliasToken, rawToken);
    const tokenHash = hashToken(rawToken);
    const inviteId = randomUUID();
    this.invites.set(inviteId, {
      id: inviteId,
      tripId,
      tokenHash,
      tokenHint: rawToken.slice(0, 8),
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      maxUses: 100,
      useCount: 0,
      boundGroupId: null,
      revokedAt: null,
      createdAt: now,
    });
    this.inviteByHash.set(tokenHash, inviteId);
    // Alias resolves to the same invite record
    this.inviteByHash.set(hashToken(aliasToken), inviteId);
  }

  private addMember(
    clubId: string,
    userId: string,
    role: ClubMemberRole,
  ): void {
    const id = randomUUID();
    this.clubMembers.set(`${clubId}:${userId}`, {
      id,
      clubId,
      userId,
      role,
      status: 'ACTIVE',
      joinedAt: new Date(),
    });
  }

  participantKey(tripId: string, userId: string): string {
    return `${tripId}:${userId}`;
  }

  locationKey(tripId: string, userId: string): string {
    return `${tripId}:${userId}`;
  }

  badgeKey(
    tripId: string,
    userId: string,
    badgeType: string,
    ruleVersion: string,
  ): string {
    return `${tripId}:${userId}:${badgeType}:${ruleVersion}`;
  }

  audit(partial: Omit<AuditEventRecord, 'id' | 'createdAt'>): void {
    this.auditEvents.push({
      ...partial,
      id: randomUUID(),
      createdAt: new Date(),
    });
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function mintInviteToken(): string {
  return randomBytes(24).toString('base64url');
}
