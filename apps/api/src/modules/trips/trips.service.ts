import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  BADGE_RULE_VERSION,
  CreateTripRequest,
  JoinTripRequest,
  SharingRequest,
  TripState,
  computeFreshness,
} from '@mcg-convoy/shared';
import { MemoryStore, hashToken, mintInviteToken } from '../../infrastructure/memory/memory.store';
import {
  assertTripTransition,
  joinAllowed,
  sharingAllowed,
} from '../badges/badge-engine';
import { BadgesService } from '../badges/badges.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { MarshalService, MarshalMessage } from '../line/marshal.service';
import { badgeReason } from '../line/marshal-messages';

@Injectable()
export class TripsService {
  constructor(
    private readonly store: MemoryStore,
    private readonly config: ConfigService,
    private readonly badges: BadgesService,
    private readonly realtime: RealtimeGateway,
    private readonly marshal: MarshalService,
  ) {}

  create(organizerId: string, dto: CreateTripRequest) {
    const club = this.store.clubs.get(dto.clubId);
    if (!club) throw new NotFoundException('Club not found');
    const membership = this.store.clubMembers.get(
      `${dto.clubId}:${organizerId}`,
    );
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('Not a club member');
    }

    const now = new Date();
    const id = randomUUID();
    const state: TripState = dto.publish ? 'PUBLISHED' : 'DRAFT';
    const trip = {
      id,
      clubId: dto.clubId,
      organizerId,
      title: dto.title,
      state,
      destination: dto.destination,
      meetingPoint: dto.meetingPoint ?? null,
      routeGeometry: null,
      lineGroupId: null,
      timezone: dto.timezone,
      targetArrivalAt: new Date(dto.targetArrivalAt),
      graceMinutes: dto.graceMinutes,
      cutoffAt: new Date(dto.cutoffAt),
      capacity: dto.capacity,
      ruleVersion: BADGE_RULE_VERSION,
      notes: dto.notes ?? null,
      cancelReason: null,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.trips.set(id, trip);

    this.store.participants.set(`${id}:${organizerId}`, {
      id: randomUUID(),
      tripId: id,
      userId: organizerId,
      vehicleId: null,
      role: 'ORGANIZER',
      sharingState: 'OFF',
      arrivalStatus: 'NONE',
      arrivedAt: null,
      visibility: 'exact',
      joinedAt: now,
      updatedAt: now,
      geofenceEnteredAt: null,
    });

    let inviteToken: string | undefined;
    if (state === 'PUBLISHED') {
      inviteToken = this.createInvite(id);
    }

    this.store.audit({
      actorId: organizerId,
      action: 'trip.create',
      targetType: 'trip',
      targetId: id,
      result: 'ok',
      reason: null,
      correlationId: null,
      metadata: { state },
    });

    return { trip: this.toSummary(trip), inviteToken };
  }

  get(tripId: string, userId: string) {
    const trip = this.requireTrip(tripId);
    this.requireParticipantOrClub(trip, userId);
    const participants = [...this.store.participants.values()]
      .filter((p) => p.tripId === tripId)
      .map((p) => {
        const user = this.store.users.get(p.userId);
        const loc = this.store.locationCurrents.get(`${tripId}:${p.userId}`);
        const age = loc
          ? (Date.now() - loc.sampledAt.getTime()) / 1000
          : Infinity;
        return {
          userId: p.userId,
          displayName: user?.displayName ?? 'Unknown',
          role: p.role,
          sharingState: p.sharingState,
          arrivalStatus: p.arrivalStatus,
          arrivedAt: p.arrivedAt?.toISOString() ?? null,
          freshness: computeFreshness(
            age,
            p.sharingState === 'ACTIVE',
          ),
          vehicleNickname:
            (p.vehicleId && this.store.vehicles.get(p.vehicleId)?.nickname) ||
            null,
        };
      });
    return { trip: this.toSummary(trip), participants };
  }

  join(tripId: string, userId: string, dto: JoinTripRequest) {
    const trip = this.requireTrip(tripId);
    if (!joinAllowed(trip.state)) {
      throw new BadRequestException(`Cannot join trip in state ${trip.state}`);
    }

    const tokenHash = this.store.resolveInviteTokenHash(dto.inviteToken);
    const inviteId = this.store.inviteByHash.get(tokenHash);
    const invite = inviteId ? this.store.invites.get(inviteId) : undefined;
    if (
      !invite ||
      invite.tripId !== tripId ||
      invite.revokedAt ||
      invite.expiresAt < new Date() ||
      invite.useCount >= invite.maxUses
    ) {
      throw new ForbiddenException('Invalid or expired invite');
    }

    const existing = this.store.participants.get(`${tripId}:${userId}`);
    if (existing) {
      return { participant: existing, alreadyJoined: true };
    }

    const count = [...this.store.participants.values()].filter(
      (p) => p.tripId === tripId,
    ).length;
    if (count >= trip.capacity) {
      throw new BadRequestException('Trip is full');
    }

    const now = new Date();
    this.store.consents.push({
      id: randomUUID(),
      userId,
      purpose: 'live_trip_location',
      policyVersion: dto.consentPolicyVersion,
      grantedAt: now,
      revokedAt: null,
      tripId,
    });

    const participant = {
      id: randomUUID(),
      tripId,
      userId,
      vehicleId: dto.vehicleId ?? null,
      role: 'DRIVER' as const,
      sharingState: 'OFF' as const,
      arrivalStatus: 'NONE' as const,
      arrivedAt: null,
      visibility: 'exact',
      joinedAt: now,
      updatedAt: now,
      geofenceEnteredAt: null,
    };
    this.store.participants.set(`${tripId}:${userId}`, participant);
    invite.useCount += 1;

    this.realtime.emitToTrip(tripId, 'participant:joined', {
      userId,
      tripId,
    });

    return { participant, alreadyJoined: false };
  }

  setSharing(tripId: string, userId: string, dto: SharingRequest) {
    const trip = this.requireTrip(tripId);
    const participant = this.requireParticipant(tripId, userId);

    if (dto.action === 'start') {
      // Organizer may open a PUBLISHED trip when starting share
      if (trip.state === 'PUBLISHED' && participant.role === 'ORGANIZER') {
        assertTripTransition(trip.state, 'OPEN');
        trip.state = 'OPEN';
        trip.updatedAt = new Date();
        this.realtime.emitToTrip(tripId, 'trip:state', { state: 'OPEN' });
      }
      if (!sharingAllowed(trip.state)) {
        throw new BadRequestException('Sharing only allowed when trip is OPEN');
      }
      participant.sharingState = 'ACTIVE';
    } else if (dto.action === 'pause') {
      participant.sharingState = 'PAUSED';
    } else {
      participant.sharingState = 'STOPPED';
    }
    participant.updatedAt = new Date();

    this.realtime.emitToTrip(tripId, 'participant:sharing', {
      userId,
      sharingState: participant.sharingState,
    });

    return { sharingState: participant.sharingState, tripState: trip.state };
  }

  openTrip(tripId: string, userId: string) {
    const trip = this.requireTrip(tripId);
    if (trip.organizerId !== userId) {
      throw new ForbiddenException('Only organizer can open trip');
    }
    assertTripTransition(trip.state, 'OPEN');
    trip.state = 'OPEN';
    trip.updatedAt = new Date();
    this.realtime.emitToTrip(tripId, 'trip:state', { state: 'OPEN' });
    this.emitMarshal(tripId, this.marshal.rollCall());
    return this.toSummary(trip);
  }

  close(tripId: string, userId: string, reason?: string) {
    const trip = this.requireTrip(tripId);
    if (trip.organizerId !== userId) {
      throw new ForbiddenException('Only organizer can close trip');
    }
    assertTripTransition(trip.state, 'CLOSED');
    trip.state = 'CLOSED';
    trip.closedAt = new Date();
    trip.updatedAt = new Date();
    trip.cancelReason = reason ?? null;

    // Stop all sharing
    for (const p of this.store.participants.values()) {
      if (p.tripId === tripId && p.sharingState === 'ACTIVE') {
        p.sharingState = 'STOPPED';
        p.updatedAt = new Date();
      }
    }

    const awards = this.badges.scoreTrip(tripId);
    this.realtime.emitToTrip(tripId, 'trip:state', { state: 'CLOSED' });
    this.realtime.emitToTrip(tripId, 'trip:results', { awards });

    // พี่นำขบวน: celebrate the convoy, drop badges, post the recap.
    const participants = [...this.store.participants.values()].filter(
      (p) => p.tripId === tripId,
    );
    const arrivedCount = participants.filter((p) => p.arrivedAt).length;
    if (participants.length > 0 && arrivedCount === participants.length) {
      this.emitMarshal(tripId, this.marshal.allArrived());
    }
    for (const a of awards) {
      const user = this.store.users.get(a.userId);
      this.emitMarshal(
        tripId,
        this.marshal.badgeDrop(
          user?.displayName ?? 'ลูกขบวน',
          a.badgeType,
          badgeReason(a.badgeType),
        ),
      );
    }
    const snaps = this.store.etaSnapshots.filter((s) => s.tripId === tripId);
    const distanceKm = Math.round(
      snaps.reduce((m, s) => Math.max(m, s.distanceM ?? 0), 0) / 1000,
    );
    const durationH = Math.round(
      snaps.reduce((m, s) => Math.max(m, s.durationSec ?? 0), 0) / 3600,
    );
    this.emitMarshal(
      tripId,
      this.marshal.tripRecap(trip.title, distanceKm, durationH, arrivedCount),
    );

    return { trip: this.toSummary(trip), awards };
  }

  results(tripId: string, userId: string) {
    const trip = this.requireTrip(tripId);
    this.requireParticipantOrClub(trip, userId);
    const awards = [...this.store.badgeAwards.values()].filter(
      (a) => a.tripId === tripId,
    );
    return {
      trip: this.toSummary(trip),
      awards: awards.map((a) => ({
        userId: a.userId,
        badgeType: a.badgeType,
        points: a.points,
        reasonCode: a.reasonCode,
        ruleVersion: a.ruleVersion,
        status: a.status,
      })),
    };
  }

  streamInfo(tripId: string, userId: string) {
    const trip = this.requireTrip(tripId);
    this.requireParticipant(tripId, userId);
    return {
      tripId,
      room: `trip:${tripId}`,
      transport: 'socket.io',
      events: [
        'location:update',
        'eta:update',
        'participant:joined',
        'participant:sharing',
        'participant:arrival',
        'trip:state',
        'trip:results',
      ],
      auth: 'Bearer JWT or session cookie on handshake auth.token',
    };
  }

  confirmArrival(
    tripId: string,
    userId: string,
    action: 'confirm' | 'dispute',
    reason?: string,
    arrivedAt?: string,
  ) {
    const trip = this.requireTrip(tripId);
    const participant = this.requireParticipant(tripId, userId);
    if (trip.state !== 'OPEN' && trip.state !== 'CLOSED') {
      throw new BadRequestException('Arrival not applicable');
    }

    if (action === 'confirm') {
      participant.arrivalStatus = 'CONFIRMED';
      participant.arrivedAt = arrivedAt
        ? new Date(arrivedAt)
        : participant.arrivedAt ?? new Date();
      if (participant.sharingState === 'ACTIVE') {
        participant.sharingState = 'STOPPED';
      }
    } else {
      participant.arrivalStatus = 'DISPUTED';
    }
    participant.updatedAt = new Date();

    this.store.audit({
      actorId: userId,
      action: `arrival.${action}`,
      targetType: 'trip_participant',
      targetId: participant.id,
      result: 'ok',
      reason: reason ?? null,
      correlationId: null,
      metadata: null,
    });

    this.realtime.emitToTrip(tripId, 'participant:arrival', {
      userId,
      arrivalStatus: participant.arrivalStatus,
      arrivedAt: participant.arrivedAt?.toISOString() ?? null,
    });

    return {
      arrivalStatus: participant.arrivalStatus,
      arrivedAt: participant.arrivedAt?.toISOString() ?? null,
    };
  }

  createInvite(tripId: string): string {
    const raw = mintInviteToken();
    const tokenHash = hashToken(raw);
    const id = randomUUID();
    this.store.invites.set(id, {
      id,
      tripId,
      tokenHash,
      tokenHint: raw.slice(0, 8),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxUses: 100,
      useCount: 0,
      boundGroupId: null,
      revokedAt: null,
      createdAt: new Date(),
    });
    this.store.inviteByHash.set(tokenHash, id);
    return raw;
  }

  private emitMarshal(tripId: string, msg: MarshalMessage): void {
    this.realtime.emitToTrip(tripId, 'marshal:message', msg);
    const trip = this.store.trips.get(tripId);
    if (trip?.lineGroupId) {
      void this.marshal.pushToLine(trip.lineGroupId, msg);
    }
  }

  /** Bind a LINE group to a trip — นำขบวน becomes a member of that group. */
  bindLineGroup(tripId: string, lineGroupId: string): void {
    const trip = this.store.trips.get(tripId);
    if (!trip) return;
    trip.lineGroupId = lineGroupId;
    trip.updatedAt = new Date();
    void this.marshal.pushToLine(
      lineGroupId,
      this.marshal.message('roll_call'),
    );
  }

  private requireTrip(tripId: string) {
    const trip = this.store.trips.get(tripId);
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  private requireParticipant(tripId: string, userId: string) {
    const p = this.store.participants.get(`${tripId}:${userId}`);
    if (!p) throw new ForbiddenException('Not a trip participant');
    return p;
  }

  private requireParticipantOrClub(
    trip: { id: string; clubId: string },
    userId: string,
  ) {
    const p = this.store.participants.get(`${trip.id}:${userId}`);
    if (p) return p;
    const m = this.store.clubMembers.get(`${trip.clubId}:${userId}`);
    if (m?.status === 'ACTIVE') return null;
    throw new ForbiddenException('Not authorized for this trip');
  }

  private toSummary(trip: {
    id: string;
    clubId: string;
    organizerId: string;
    title: string;
    state: TripState;
    timezone: string;
    destination: { lat: number; lng: number };
    meetingPoint: { lat: number; lng: number } | null;
    targetArrivalAt: Date;
    graceMinutes: number;
    cutoffAt: Date;
    capacity: number;
    ruleVersion: string;
    notes: string | null;
  }) {
    const participantCount = [...this.store.participants.values()].filter(
      (p) => p.tripId === trip.id,
    ).length;
    return {
      id: trip.id,
      clubId: trip.clubId,
      organizerId: trip.organizerId,
      title: trip.title,
      state: trip.state,
      timezone: trip.timezone,
      destination: trip.destination,
      meetingPoint: trip.meetingPoint,
      targetArrivalAt: trip.targetArrivalAt.toISOString(),
      graceMinutes: trip.graceMinutes,
      cutoffAt: trip.cutoffAt.toISOString(),
      capacity: trip.capacity,
      ruleVersion: trip.ruleVersion,
      notes: trip.notes,
      participantCount,
    };
  }
}
