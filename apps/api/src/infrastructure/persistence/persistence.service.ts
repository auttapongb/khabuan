import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemoryStore } from '../memory/memory.store';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Persists the in-memory store to Postgres.
 *
 * The app keeps MemoryStore as its hot read/write path (single instance), but in
 * PERSISTENCE_MODE=prisma it is hydrated from Postgres on boot and flushed back
 * on an interval + on shutdown, so data survives restarts.
 */
@Injectable()
export class PersistenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PersistenceService.name);
  private timer: NodeJS.Timeout | null = null;
  private flushing = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly store: MemoryStore,
  ) {}

  private get enabled(): boolean {
    return (
      this.config.get<string>('PERSISTENCE_MODE', 'memory') === 'prisma' &&
      this.prisma.isEnabled()
    );
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) return;
    await this.hydrate();
    this.timer = setInterval(() => {
      void this.flush().catch((err) =>
        this.logger.error(`flush failed: ${(err as Error).message}`),
      );
    }, 30_000);
    this.timer.unref?.();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    if (this.enabled) await this.flush();
  }

  /** Load all persisted rows into the in-memory maps. */
  async hydrate(): Promise<void> {
    const t0 = Date.now();
    const [
      users,
      clubs,
      clubMembers,
      vehicleIcons,
      vehicles,
      trips,
      participants,
      invites,
      locations,
      samples,
      etas,
      badges,
      consents,
    ] = await Promise.all([
      this.prisma.user.findMany(),
      this.prisma.club.findMany(),
      this.prisma.clubMember.findMany(),
      this.prisma.vehicleIconAsset.findMany(),
      this.prisma.vehicle.findMany(),
      this.prisma.trip.findMany(),
      this.prisma.tripParticipant.findMany(),
      this.prisma.invite.findMany(),
      this.prisma.locationCurrent.findMany(),
      this.prisma.locationSample.findMany(),
      this.prisma.etaSnapshot.findMany(),
      this.prisma.badgeAward.findMany(),
      this.prisma.consentRecord.findMany(),
    ]);

    for (const u of users) {
      this.store.users.set(u.id, {
        id: u.id,
        lineSubject: u.lineSubject,
        displayName: u.displayName,
        status: u.status,
        locale: u.locale,
        isAdmin: u.isAdmin,
        isTestAccount: u.isTestAccount,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      });
    }
    for (const c of clubs) {
      this.store.clubs.set(c.id, {
        id: c.id,
        tenantId: c.tenantId,
        name: c.name,
        visibility: c.visibility,
        ownerId: c.ownerId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      });
    }
    for (const m of clubMembers) {
      this.store.clubMembers.set(`${m.clubId}:${m.userId}`, {
        id: m.id,
        clubId: m.clubId,
        userId: m.userId,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
      });
    }
    for (const v of vehicleIcons) {
      this.store.vehicleIcons.set(v.id, {
        id: v.id,
        slug: v.slug,
        label: v.label,
        svgPath: v.svgPath,
        rightsNotes: v.rightsNotes,
        active: v.active,
        createdAt: v.createdAt,
      });
    }
    for (const v of vehicles) {
      this.store.vehicles.set(v.id, {
        id: v.id,
        userId: v.userId,
        nickname: v.nickname,
        class: v.class,
        color: v.color,
        iconAssetId: v.iconAssetId,
        plateAlias: v.plateAlias,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      });
    }
    for (const t of trips) {
      this.store.trips.set(t.id, {
        id: t.id,
        clubId: t.clubId,
        organizerId: t.organizerId,
        title: t.title,
        state: t.state as never,
        destination: t.destination as never,
        meetingPoint: (t.meetingPoint as never) ?? null,
        routeGeometry: (t.routeGeometry as never) ?? null,
        lineGroupId: t.lineGroupId,
        timezone: t.timezone,
        targetArrivalAt: t.targetArrivalAt,
        graceMinutes: t.graceMinutes,
        cutoffAt: t.cutoffAt,
        capacity: t.capacity,
        ruleVersion: t.ruleVersion,
        notes: t.notes,
        cancelReason: t.cancelReason,
        closedAt: t.closedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      });
    }
    for (const p of participants) {
      this.store.participants.set(`${p.tripId}:${p.userId}`, {
        id: p.id,
        tripId: p.tripId,
        userId: p.userId,
        vehicleId: p.vehicleId,
        role: p.role,
        sharingState: p.sharingState,
        arrivalStatus: p.arrivalStatus,
        arrivedAt: p.arrivedAt,
        visibility: p.visibility,
        joinedAt: p.joinedAt,
        updatedAt: p.updatedAt,
        geofenceEnteredAt: p.geofenceEnteredAt,
      });
    }
    for (const i of invites) {
      this.store.invites.set(i.id, {
        id: i.id,
        tripId: i.tripId,
        tokenHash: i.tokenHash,
        tokenHint: i.tokenHint,
        expiresAt: i.expiresAt,
        maxUses: i.maxUses,
        useCount: i.useCount,
        boundGroupId: i.boundGroupId,
        revokedAt: i.revokedAt,
        createdAt: i.createdAt,
      });
      this.store.inviteByHash.set(i.tokenHash, i.id);
    }
    for (const l of locations) {
      this.store.locationCurrents.set(`${l.tripId}:${l.userId}`, {
        id: l.id,
        tripId: l.tripId,
        userId: l.userId,
        point: l.point as never,
        accuracyM: l.accuracyM,
        headingDeg: l.headingDeg,
        seq: l.seq,
        sampledAt: l.sampledAt,
        receivedAt: l.receivedAt,
        freshness: l.freshness,
      });
    }
    this.store.locationSamples = samples.map((s) => ({
      id: s.id,
      tripId: s.tripId,
      userId: s.userId,
      seq: s.seq,
      point: s.point as never,
      accuracyM: s.accuracyM,
      headingDeg: s.headingDeg,
      speedMps: s.speedMps,
      sampledAt: s.sampledAt,
      receivedAt: s.receivedAt,
      accepted: s.accepted,
      rejectReason: s.rejectReason,
    }));
    this.store.etaSnapshots = etas.map((e) => ({
      id: e.id,
      tripId: e.tripId,
      userId: e.userId,
      provider: e.provider,
      etaAt: e.etaAt,
      durationSec: e.durationSec,
      distanceM: e.distanceM,
      confidence: e.confidence,
      routeVersion: e.routeVersion,
      stale: e.stale,
      calculatedAt: e.calculatedAt,
    }));
    for (const b of badges) {
      this.store.badgeAwards.set(
        this.store.badgeKey(b.tripId, b.userId, b.badgeType, b.ruleVersion),
        {
          id: b.id,
          tripId: b.tripId,
          userId: b.userId,
          badgeType: b.badgeType as never,
          ruleVersion: b.ruleVersion,
          points: b.points,
          reasonCode: b.reasonCode,
          inputHash: b.inputHash,
          status: b.status,
          createdAt: b.createdAt,
        },
      );
    }
    this.store.consents = consents.map((c) => ({
      id: c.id,
      userId: c.userId,
      purpose: c.purpose,
      policyVersion: c.policyVersion,
      grantedAt: c.grantedAt,
      revokedAt: c.revokedAt,
      tripId: c.tripId,
    }));

    this.logger.log(
      `hydrated: ${users.length} users, ${trips.length} trips, ${participants.length} participants (${Date.now() - t0}ms)`,
    );
  }

  /** Upsert all in-memory entities back to Postgres. */
  async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      await this.prisma.$transaction(
        async (tx) => {
          for (const u of this.store.users.values()) {
            await tx.user.upsert({
              where: { id: u.id },
              create: {
                id: u.id,
                lineSubject: u.lineSubject,
                displayName: u.displayName,
                status: u.status as never,
                locale: u.locale,
                isAdmin: u.isAdmin,
                isTestAccount: u.isTestAccount,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
              },
              update: {
                lineSubject: u.lineSubject,
                displayName: u.displayName,
                status: u.status as never,
                locale: u.locale,
                isAdmin: u.isAdmin,
                isTestAccount: u.isTestAccount,
                updatedAt: u.updatedAt,
              },
            });
          }
          for (const c of this.store.clubs.values()) {
            await tx.club.upsert({
              where: { id: c.id },
              create: {
                id: c.id,
                tenantId: c.tenantId,
                name: c.name,
                visibility: c.visibility,
                ownerId: c.ownerId,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
              },
              update: {
                tenantId: c.tenantId,
                name: c.name,
                visibility: c.visibility,
                ownerId: c.ownerId,
                updatedAt: c.updatedAt,
              },
            });
          }
          for (const m of this.store.clubMembers.values()) {
            await tx.clubMember.upsert({
              where: { id: m.id },
              create: {
                id: m.id,
                clubId: m.clubId,
                userId: m.userId,
                role: m.role as never,
                status: m.status as never,
                joinedAt: m.joinedAt,
              },
              update: {
                role: m.role as never,
                status: m.status as never,
              },
            });
          }
          for (const v of this.store.vehicleIcons.values()) {
            await tx.vehicleIconAsset.upsert({
              where: { id: v.id },
              create: {
                id: v.id,
                slug: v.slug,
                label: v.label,
                svgPath: v.svgPath,
                rightsNotes: v.rightsNotes,
                active: v.active,
                createdAt: v.createdAt,
              },
              update: {
                slug: v.slug,
                label: v.label,
                svgPath: v.svgPath,
                rightsNotes: v.rightsNotes,
                active: v.active,
              },
            });
          }
          for (const v of this.store.vehicles.values()) {
            await tx.vehicle.upsert({
              where: { id: v.id },
              create: {
                id: v.id,
                userId: v.userId,
                nickname: v.nickname,
                class: v.class,
                color: v.color,
                iconAssetId: v.iconAssetId,
                plateAlias: v.plateAlias,
                createdAt: v.createdAt,
                updatedAt: v.updatedAt,
              },
              update: {
                userId: v.userId,
                nickname: v.nickname,
                class: v.class,
                color: v.color,
                iconAssetId: v.iconAssetId,
                plateAlias: v.plateAlias,
                updatedAt: v.updatedAt,
              },
            });
          }
          for (const t of this.store.trips.values()) {
            await tx.trip.upsert({
              where: { id: t.id },
              create: {
                id: t.id,
                clubId: t.clubId,
                organizerId: t.organizerId,
                title: t.title,
                state: t.state as never,
                destination: t.destination as never,
                meetingPoint: t.meetingPoint as never,
                routeGeometry: t.routeGeometry as never,
                lineGroupId: t.lineGroupId,
                timezone: t.timezone,
                targetArrivalAt: t.targetArrivalAt,
                graceMinutes: t.graceMinutes,
                cutoffAt: t.cutoffAt,
                capacity: t.capacity,
                ruleVersion: t.ruleVersion,
                notes: t.notes,
                cancelReason: t.cancelReason,
                closedAt: t.closedAt,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
              },
              update: {
                clubId: t.clubId,
                organizerId: t.organizerId,
                title: t.title,
                state: t.state as never,
                destination: t.destination as never,
                meetingPoint: t.meetingPoint as never,
                routeGeometry: t.routeGeometry as never,
                lineGroupId: t.lineGroupId,
                timezone: t.timezone,
                targetArrivalAt: t.targetArrivalAt,
                graceMinutes: t.graceMinutes,
                cutoffAt: t.cutoffAt,
                capacity: t.capacity,
                ruleVersion: t.ruleVersion,
                notes: t.notes,
                cancelReason: t.cancelReason,
                closedAt: t.closedAt,
                updatedAt: t.updatedAt,
              },
            });
          }
          for (const p of this.store.participants.values()) {
            await tx.tripParticipant.upsert({
              where: { id: p.id },
              create: {
                id: p.id,
                tripId: p.tripId,
                userId: p.userId,
                vehicleId: p.vehicleId,
                role: p.role as never,
                sharingState: p.sharingState as never,
                arrivalStatus: p.arrivalStatus as never,
                arrivedAt: p.arrivedAt,
                visibility: p.visibility,
                joinedAt: p.joinedAt,
                updatedAt: p.updatedAt,
                geofenceEnteredAt: p.geofenceEnteredAt,
              },
              update: {
                vehicleId: p.vehicleId,
                role: p.role as never,
                sharingState: p.sharingState as never,
                arrivalStatus: p.arrivalStatus as never,
                arrivedAt: p.arrivedAt,
                visibility: p.visibility,
                updatedAt: p.updatedAt,
                geofenceEnteredAt: p.geofenceEnteredAt,
              },
            });
          }
          for (const i of this.store.invites.values()) {
            await tx.invite.upsert({
              where: { id: i.id },
              create: {
                id: i.id,
                tripId: i.tripId,
                tokenHash: i.tokenHash,
                tokenHint: i.tokenHint,
                expiresAt: i.expiresAt,
                maxUses: i.maxUses,
                useCount: i.useCount,
                boundGroupId: i.boundGroupId,
                revokedAt: i.revokedAt,
                createdAt: i.createdAt,
              },
              update: {
                useCount: i.useCount,
                boundGroupId: i.boundGroupId,
                revokedAt: i.revokedAt,
              },
            });
          }
          for (const l of this.store.locationCurrents.values()) {
            await tx.locationCurrent.upsert({
              where: { id: l.id },
              create: {
                id: l.id,
                tripId: l.tripId,
                userId: l.userId,
                point: l.point as never,
                accuracyM: l.accuracyM,
                headingDeg: l.headingDeg,
                seq: l.seq,
                sampledAt: l.sampledAt,
                receivedAt: l.receivedAt,
                freshness: l.freshness,
              },
              update: {
                point: l.point as never,
                accuracyM: l.accuracyM,
                headingDeg: l.headingDeg,
                seq: l.seq,
                sampledAt: l.sampledAt,
                freshness: l.freshness,
              },
            });
          }
          for (const s of this.store.locationSamples) {
            await tx.locationSample.upsert({
              where: { id: s.id },
              create: {
                id: s.id,
                tripId: s.tripId,
                userId: s.userId,
                seq: s.seq,
                point: s.point as never,
                accuracyM: s.accuracyM,
                headingDeg: s.headingDeg,
                speedMps: s.speedMps,
                sampledAt: s.sampledAt,
                receivedAt: s.receivedAt,
                accepted: s.accepted,
                rejectReason: s.rejectReason,
              },
              update: {
                point: s.point as never,
                accuracyM: s.accuracyM,
                headingDeg: s.headingDeg,
                speedMps: s.speedMps,
                accepted: s.accepted,
                rejectReason: s.rejectReason,
              },
            });
          }
          for (const e of this.store.etaSnapshots) {
            await tx.etaSnapshot.upsert({
              where: { id: e.id },
              create: {
                id: e.id,
                tripId: e.tripId,
                userId: e.userId,
                provider: e.provider,
                etaAt: e.etaAt,
                durationSec: e.durationSec,
                distanceM: e.distanceM,
                confidence: e.confidence,
                routeVersion: e.routeVersion,
                stale: e.stale,
                calculatedAt: e.calculatedAt,
              },
              update: {
                etaAt: e.etaAt,
                durationSec: e.durationSec,
                distanceM: e.distanceM,
                confidence: e.confidence,
                routeVersion: e.routeVersion,
                stale: e.stale,
              },
            });
          }
          for (const b of this.store.badgeAwards.values()) {
            await tx.badgeAward.upsert({
              where: { id: b.id },
              create: {
                id: b.id,
                tripId: b.tripId,
                userId: b.userId,
                badgeType: b.badgeType as never,
                ruleVersion: b.ruleVersion,
                points: b.points,
                reasonCode: b.reasonCode,
                inputHash: b.inputHash,
                status: b.status as never,
                createdAt: b.createdAt,
              },
              update: {
                points: b.points,
                status: b.status as never,
              },
            });
          }
          for (const c of this.store.consents) {
            await tx.consentRecord.upsert({
              where: { id: c.id },
              create: {
                id: c.id,
                userId: c.userId,
                purpose: c.purpose,
                policyVersion: c.policyVersion,
                grantedAt: c.grantedAt,
                revokedAt: c.revokedAt,
                tripId: c.tripId,
              },
              update: {
                revokedAt: c.revokedAt,
              },
            });
          }
        },
        { timeout: 30_000 },
      );
      this.logger.log('flushed to Postgres');
    } finally {
      this.flushing = false;
    }
  }
}
