import { Injectable, NotFoundException } from '@nestjs/common';
import { MemoryStore } from '../../infrastructure/memory/memory.store';

@Injectable()
export class InvitesService {
  constructor(private readonly store: MemoryStore) {}

  resolve(tokenOrAlias: string) {
    const tokenHash = this.store.resolveInviteTokenHash(tokenOrAlias);
    const inviteId = this.store.inviteByHash.get(tokenHash);
    const invite = inviteId ? this.store.invites.get(inviteId) : undefined;

    if (
      !invite ||
      invite.revokedAt ||
      invite.expiresAt < new Date() ||
      invite.useCount >= invite.maxUses
    ) {
      throw new NotFoundException('Invite not found or expired');
    }

    const trip = this.store.trips.get(invite.tripId);
    if (!trip) throw new NotFoundException('Trip not found');

    const organizer = this.store.users.get(trip.organizerId);
    const participantCount = [...this.store.participants.values()].filter(
      (p) => p.tripId === trip.id,
    ).length;

    return {
      id: trip.id,
      clubId: trip.clubId,
      organizerId: trip.organizerId,
      organizerName: organizer?.displayName ?? 'Organizer',
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
      invite: {
        expiresAt: invite.expiresAt.toISOString(),
        remainingUses: Math.max(0, invite.maxUses - invite.useCount),
      },
    };
  }
}
