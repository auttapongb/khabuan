import { z } from 'zod';
import { BadgeTypeSchema } from '../types/trip.js';

export const BADGE_RULE_VERSION = '1.0.0';

export const BadgeRuleSchema = z.object({
  type: BadgeTypeSchema,
  points: z.number().int(),
  description: z.string(),
  /** Guardrail notes — never speed-based. */
  guardrail: z.string(),
});
export type BadgeRule = z.infer<typeof BadgeRuleSchema>;

export const BADGE_RULES_V1: readonly BadgeRule[] = [
  {
    type: 'EARLY_BIRD',
    points: 15,
    description: 'Validated arrival 10–30 minutes before target',
    guardrail: 'No benefit for arriving >30 minutes early',
  },
  {
    type: 'ON_TIME',
    points: 20,
    description: 'Arrival from 10 minutes early through grace-window end',
    guardrail: 'Highest punctuality reward',
  },
  {
    type: 'JUST_IN_TIME',
    points: 10,
    description: 'Arrival in final 5 minutes of grace window',
    guardrail: 'Neutral tone; no speed implication',
  },
  {
    type: 'LATE_ARRIVAL',
    points: 2,
    description: 'Arrival after grace window but before cutoff',
    guardrail: 'Private by default; avoid ridicule',
  },
  {
    type: 'RELIABLE_CRUISER',
    points: 25,
    description: 'On time in 3 consecutive eligible trips',
    guardrail: 'Minimum 3 trips',
  },
  {
    type: 'ROAD_CAPTAIN',
    points: 15,
    description: 'Organizer closes trip with ≥80% arrivals',
    guardrail: 'Once per trip',
  },
  {
    type: 'SAFETY_FIRST',
    points: 10,
    description: 'Sharing stopped/paused correctly and arrival confirmed',
    guardrail: 'No driving-behavior claim',
  },
] as const;

export const BadgeAwardInputSchema = z.object({
  tripId: z.string().uuid(),
  userId: z.string().uuid(),
  badgeType: BadgeTypeSchema,
  ruleVersion: z.string(),
  points: z.number().int(),
  reasonCode: z.string(),
  inputHash: z.string(),
});
export type BadgeAwardInput = z.infer<typeof BadgeAwardInputSchema>;
