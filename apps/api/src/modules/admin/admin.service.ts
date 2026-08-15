import { Injectable } from '@nestjs/common';
import { MemoryStore } from '../../infrastructure/memory/memory.store';

@Injectable()
export class AdminService {
  constructor(private readonly store: MemoryStore) {}

  listTrips() {
    return [...this.store.trips.values()].map((t) => ({
      id: t.id,
      title: t.title,
      state: t.state,
      clubId: t.clubId,
      organizerId: t.organizerId,
      cutoffAt: t.cutoffAt.toISOString(),
    }));
  }

  listUsers() {
    return [...this.store.users.values()].map((u) => ({
      id: u.id,
      displayName: u.displayName,
      status: u.status,
      isAdmin: u.isAdmin,
      lineSubject: u.lineSubject,
    }));
  }

  listVehicleIcons() {
    return [...this.store.vehicleIcons.values()].filter((i) => i.active);
  }

  listAudit(limit = 50) {
    return this.store.auditEvents.slice(-limit).reverse();
  }

  revokeInvite(inviteId: string, actorId: string) {
    const invite = this.store.invites.get(inviteId);
    if (!invite) return null;
    invite.revokedAt = new Date();
    this.store.audit({
      actorId,
      action: 'invite.revoke',
      targetType: 'invite',
      targetId: inviteId,
      result: 'ok',
      reason: null,
      correlationId: null,
      metadata: null,
    });
    return invite;
  }
}
