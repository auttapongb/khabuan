import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  computeTripBadges,
  dedupeAwards,
} from './badge-engine';
import { MemoryStore } from '../../infrastructure/memory/memory.store';
import { BadgeAwardRecord } from '../../infrastructure/memory/types';

@Injectable()
export class BadgesService {
  constructor(private readonly store: MemoryStore) {}

  scoreTrip(tripId: string): BadgeAwardRecord[] {
    const trip = this.store.trips.get(tripId);
    if (!trip) return [];

    const participants = [...this.store.participants.values()]
      .filter((p) => p.tripId === tripId)
      .map((p) => {
        const user = this.store.users.get(p.userId);
        return {
          userId: p.userId,
          isOrganizer: p.role === 'ORGANIZER',
          isTestAccount: user?.isTestAccount ?? false,
          arrivedAt: p.arrivedAt,
          arrivalStatus: p.arrivalStatus,
          sharingEndedCleanly:
            p.sharingState === 'STOPPED' || p.sharingState === 'PAUSED',
          consecutiveOnTimeCount: 0,
        };
      });

    // For demo scoring with test accounts: include them when all are test accounts
    const allTest = participants.every((p) => p.isTestAccount);
    const scoreParticipants = allTest
      ? participants.map((p) => ({ ...p, isTestAccount: false }))
      : participants;

    const computed = dedupeAwards(
      computeTripBadges({
        tripId,
        targetArrivalAt: trip.targetArrivalAt,
        graceMinutes: trip.graceMinutes,
        cutoffAt: trip.cutoffAt,
        ruleVersion: trip.ruleVersion,
        participants: scoreParticipants,
      }),
    );

    const awards: BadgeAwardRecord[] = [];
    for (const c of computed) {
      const key = this.store.badgeKey(
        tripId,
        c.userId,
        c.badgeType,
        c.ruleVersion,
      );
      if (this.store.badgeAwards.has(key)) {
        awards.push(this.store.badgeAwards.get(key)!);
        continue;
      }
      const record: BadgeAwardRecord = {
        id: randomUUID(),
        tripId,
        userId: c.userId,
        badgeType: c.badgeType,
        ruleVersion: c.ruleVersion,
        points: c.points,
        reasonCode: c.reasonCode,
        inputHash: c.inputHash,
        status: 'AWARDED',
        createdAt: new Date(),
      };
      this.store.badgeAwards.set(key, record);
      awards.push(record);
    }
    return awards;
  }
}
