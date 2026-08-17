import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LineClient } from './line-client';
import {
  badgeLabel,
  MARSHAL_TEMPLATES,
  MarshalTemplate,
  MarshalTemplateKey,
} from './marshal-messages';

export type MarshalTarget = 'group' | 'dm';

export interface MarshalMessage {
  target: MarshalTarget;
  text: string;
  key: MarshalTemplateKey;
}

/**
 * พี่นำขบวน — the convoy marshal persona.
 *
 * Turns realtime trip events into friendly Thai messages, then routes them to
 * the trip room (Socket.IO) and — when LINE credentials are configured — to
 * the LINE group. The persona absorbs the awkward social chore (the
 * "who's late" nag) so the organizer never has to be the bad guy.
 */
@Injectable()
export class MarshalService {
  private readonly logger = new Logger(MarshalService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly lineClient: LineClient,
  ) {}

  /**
   * Render a template with the given placeholders. Unknown tokens are left
   * as-is so a missing substitution is visible rather than silent.
   */
  private render(
    key: MarshalTemplateKey,
    vars: Record<string, string | number> = {},
    lang: 'th' | 'en' = 'th',
  ): string {
    const tpl = MARSHAL_TEMPLATES[key] as MarshalTemplate;
    const base = lang === 'en' ? tpl.en : tpl.th;
    return Object.entries(vars).reduce(
      (out, [k, v]) => out.replaceAll(`{${k}}`, String(v)),
      base,
    );
  }

  /** Message only — no side effects. Pure, unit-testable. */
  message(
    key: MarshalTemplateKey,
    vars: Record<string, string | number> = {},
    target: MarshalTarget = 'group',
    lang: 'th' | 'en' = 'th',
  ): MarshalMessage {
    return { target, text: this.render(key, vars, lang), key };
  }

  // ── Persona lines for trip lifecycle events ─────────────────────────────

  tripCreated(title: string): MarshalMessage {
    return this.message('trip_created', { title });
  }

  rollCall(): MarshalMessage {
    return this.message('roll_call');
  }

  rollCallReminder(count: number): MarshalMessage {
    return this.message('roll_call_reminder', { count });
  }

  countdown(days: number): MarshalMessage {
    return this.message('countdown_days', { days });
  }

  checklist(time: string): MarshalMessage {
    return this.message('checklist', { time });
  }

  departure(departed: number, remaining: number, isFirst: boolean): MarshalMessage {
    return isFirst
      ? this.message('first_departure')
      : this.message('departure', { departed, remaining });
  }

  arrival(order: number): MarshalMessage {
    return this.message('arrival', { n: order });
  }

  halfway(): MarshalMessage {
    return this.message('progress_halfway');
  }

  /** The gentle anonymous nag (group) — never names the late member. */
  nagGroup(remaining: number, etaMinutes: number): MarshalMessage {
    return this.message('nag_group', { remaining, eta: etaMinutes });
  }

  /** The private DM nag — the "are you safe?" check, not a scolding. */
  nagDm(): MarshalMessage {
    return this.message('nag_dm', {}, 'dm');
  }

  pitStop(): MarshalMessage {
    return this.message('pit_stop');
  }

  lost(): MarshalMessage {
    return this.message('lost');
  }

  allArrived(): MarshalMessage {
    return this.message('all_arrived');
  }

  badgeDrop(name: string, badgeType: string, reason: string): MarshalMessage {
    return this.message('badge_drop', {
      name,
      badge: badgeLabel(badgeType),
      reason,
    });
  }

  streak(clubName: string, streakCount: number): MarshalMessage {
    return this.message('streak', { club: clubName, streak: streakCount });
  }

  tripRecap(
    title: string,
    distanceKm: number,
    durationH: number,
    count: number,
  ): MarshalMessage {
    return this.message('trip_recap', {
      title,
      distance: distanceKm,
      duration: durationH,
      count,
    });
  }

  // ── Chat-as-interface command responses ─────────────────────────────────

  confirmArrival(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('arrived_confirm', {}, 'group', lang);
  }

  confirmDeparture(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('departed_confirm', {}, 'group', lang);
  }

  confirmPitStop(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('pitstop_confirm', {}, 'group', lang);
  }

  confirmResume(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('resume_confirm', {}, 'group', lang);
  }

  helpLost(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('lost_help', {}, 'group', lang);
  }

  statusReply(
    arrived: number,
    total: number,
    lang: 'th' | 'en' = 'th',
  ): MarshalMessage {
    return this.message('status_reply', { arrived, total }, 'group', lang);
  }

  joinGreeting(): MarshalMessage {
    return this.message('join_greeting');
  }

  bindConfirm(): MarshalMessage {
    return this.message('bind_confirm');
  }

  bindHelp(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('bind_help', {}, 'group', lang);
  }

  bindNeedGroup(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('bind_need_group', {}, 'group', lang);
  }

  bindNotFound(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('bind_not_found', {}, 'group', lang);
  }

  bindAlready(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('bind_already', {}, 'group', lang);
  }

  bindConflict(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('bind_conflict', {}, 'group', lang);
  }

  bindAmbiguous(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('bind_ambiguous', {}, 'group', lang);
  }

  help(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('help_menu', {}, 'group', lang);
  }

  notBound(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('not_bound', {}, 'group', lang);
  }

  createStart(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('create_start', {}, 'group', lang);
  }

  createAskDestination(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('create_ask_destination', {}, 'group', lang);
  }

  createAskTime(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('create_ask_time', {}, 'group', lang);
  }

  createDone(
    title: string,
    code: string,
    lang: 'th' | 'en' = 'th',
  ): MarshalMessage {
    return this.message('create_done', { title, code }, 'group', lang);
  }

  myTripsNone(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('my_trips_none', {}, 'group', lang);
  }

  bindPick(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('bind_pick', {}, 'group', lang);
  }

  createCancelled(lang: 'th' | 'en' = 'th'): MarshalMessage {
    return this.message('create_cancelled', {}, 'group', lang);
  }

  // ── Delivery ────────────────────────────────────────────────────────────

  /** Whether LINE Messaging API push is configured (non-demo). */
  get lineEnabled(): boolean {
    return this.lineClient.enabled;
  }

  /**
   * Push a message to a LINE target (group or user id). In demo mode the
   * LineClient no-ops and logs; with LINE_CHANNEL_ACCESS_TOKEN it POSTs to the
   * Messaging API push endpoint. Kept as an explicit seam so the persona is
   * testable without LINE credentials.
   */
  pushToLine(to: string, msg: MarshalMessage): Promise<void> {
    return this.lineClient.pushText(to, msg.text);
  }
}
