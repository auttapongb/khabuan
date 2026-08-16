import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { BADGE_RULE_VERSION } from '@mcg-convoy/shared';
import { inferMode, parseWake, type WakeKind } from './wake';
import { MarshalService, MarshalMessage } from './marshal.service';
import { LineClient, type LineTextMessage } from './line-client';
import { MemoryStore } from '../../infrastructure/memory/memory.store';
import type { TripRecord } from '../../infrastructure/memory/types';

/** ผูกขบวน <code> / #ขบวน ผูก <code> / bind <code> (code = full UUID or short 6-char prefix) */
const BIND_RE =
  /ผูกขบวน\s+([0-9a-zA-Z-]{4,})|#ขบวน\s*ผูก\s*([0-9a-zA-Z-]{4,})|bind\s+([0-9a-zA-Z-]{4,})/i;

interface PendingCreate {
  step: 'name' | 'destination' | 'time';
  name: string | null;
  destination: { lat: number; lng: number; label: string } | null;
}

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly marshal: MarshalService,
    private readonly lineClient: LineClient,
    private readonly store: MemoryStore,
  ) {}

  /** Reply with an optional quick-reply button bar. */
  private async replyText(
    replyToken: string | undefined,
    text: string,
    quickLabels?: string[],
  ): Promise<void> {
    if (!replyToken) return;
    const msg: LineTextMessage = { type: 'text', text };
    if (quickLabels?.length) {
      msg.quickReply = this.lineClient.quickReply(quickLabels);
    }
    await this.lineClient.reply(replyToken, [msg]);
  }

  /** Reply with quick replies whose labels differ from the text they send. */
  private async replyTextPairs(
    replyToken: string | undefined,
    text: string,
    items: { label: string; text: string }[],
  ): Promise<void> {
    if (!replyToken) return;
    const msg: LineTextMessage = {
      type: 'text',
      text,
      quickReply: this.lineClient.quickReplyPairs(items),
    };
    await this.lineClient.reply(replyToken, [msg]);
  }

  /** The main command menu as quick-reply buttons, in the reply language. */
  private menuButtons(lang: 'th' | 'en'): string[] {
    return lang === 'en'
      ? ['Check', 'Arrived', 'Departed', 'Pit stop', 'Lost']
      : ['เช็คขบวน', 'ถึงแล้ว', 'ออกตัว', 'แวะปั๊ม', 'หลงทาง'];
  }

  /** In-progress trip creation flows, keyed by LINE user id. */
  private readonly pendingCreates = new Map<string, PendingCreate>();

  /** Find a user by LINE subject, or create one. */
  private ensureUser(lineUserId: string): string {
    const existing = [...this.store.users.values()].find(
      (u) => u.lineSubject === lineUserId,
    );
    if (existing) return existing.id;
    const now = new Date();
    const user = {
      id: randomUUID(),
      lineSubject: lineUserId,
      displayName: 'สมาชิกขบวน',
      status: 'ACTIVE' as const,
      locale: 'th',
      isAdmin: false,
      isTestAccount: false,
      createdAt: now,
      updatedAt: now,
    };
    this.store.users.set(user.id, user);
    return user.id;
  }

  /** Find the user's own club, or create one (single-owner "ขบวนของ …"). */
  private ensureClub(userId: string, displayName: string): string {
    const owned = [...this.store.clubs.values()].find((c) => c.ownerId === userId);
    if (owned) return owned.id;
    const now = new Date();
    const club = {
      id: randomUUID(),
      tenantId: 'line',
      name: `ขบวนของ ${displayName}`,
      visibility: 'PRIVATE',
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    };
    this.store.clubs.set(club.id, club);
    this.store.clubMembers.set(`${club.id}:${userId}`, {
      id: randomUUID(),
      clubId: club.id,
      userId,
      role: 'OWNER' as never,
      status: 'ACTIVE' as const,
      joinedAt: now,
    });
    return club.id;
  }

  /** Create a trip from LINE chat with minimal fields + sensible defaults. */
  private createTripFromLine(
    userId: string,
    displayName: string,
    name: string,
    destination: { lat: number; lng: number; label: string },
    arrival: Date,
  ): { id: string; code: string } {
    const clubId = this.ensureClub(userId, displayName);
    const now = new Date();
    const id = randomUUID();
    this.store.trips.set(id, {
      id,
      clubId,
      organizerId: userId,
      title: name,
      state: 'OPEN' as never,
      destination: { lat: destination.lat, lng: destination.lng },
      meetingPoint: null,
      routeGeometry: null,
      lineGroupId: null,
      timezone: 'Asia/Bangkok',
      targetArrivalAt: arrival,
      graceMinutes: 15,
      cutoffAt: new Date(arrival.getTime() - 2 * 60 * 60 * 1000),
      capacity: 50,
      ruleVersion: BADGE_RULE_VERSION,
      notes: destination.label,
      cancelReason: null,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    this.store.participants.set(`${id}:${userId}`, {
      id: randomUUID(),
      tripId: id,
      userId,
      vehicleId: null,
      role: 'ORGANIZER' as never,
      sharingState: 'OFF' as never,
      arrivalStatus: 'NONE' as never,
      arrivedAt: null,
      visibility: 'exact',
      joinedAt: now,
      updatedAt: now,
      geofenceEnteredAt: null,
    });
    return { id, code: id.slice(0, 6).toUpperCase() };
  }

  /** The user's own (open/published/draft) trips, newest first. */
  private myTrips(userId: string): TripRecord[] {
    return [...this.store.trips.values()]
      .filter(
        (t) =>
          t.organizerId === userId &&
          (t.state === 'OPEN' || t.state === 'PUBLISHED' || t.state === 'DRAFT'),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /** Parse a Thai/English date-time string into a Date, or null. */
  private parseArrival(text: string): Date | null {
    const t = text.trim();
    const now = new Date();
    const timeMatch = t.match(/(\d{1,2}):(\d{2})/);
    const hh = timeMatch ? parseInt(timeMatch[1], 10) : 9;
    const mm = timeMatch ? parseInt(timeMatch[2], 10) : 0;

    // DD/MM or DD/MM/YYYY
    const dateMatch = t.match(/(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{4}))?/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1;
      const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : now.getFullYear();
      return new Date(year, month, day, hh, mm);
    }

    // Thai month names (e.g. "25 ส.ค." / "25 สิงหาคม")
    const months: [string, number][] = [
      ['ม.ค.', 0], ['มกราคม', 0], ['ก.พ.', 1], ['กุมภาพันธ์', 1],
      ['มี.ค.', 2], ['มีนาคม', 2], ['เม.ย.', 3], ['เมษายน', 3],
      ['พ.ค.', 4], ['พฤษภาคม', 4], ['มิ.ย.', 5], ['มิถุนายน', 5],
      ['ก.ค.', 6], ['กรกฎาคม', 6], ['ส.ค.', 7], ['สิงหาคม', 7],
      ['ก.ย.', 8], ['กันยายน', 8], ['ต.ค.', 9], ['ตุลาคม', 9],
      ['พ.ย.', 10], ['พฤศจิกายน', 10], ['ธ.ค.', 11], ['ธันวาคม', 11],
      ['jan', 0], ['feb', 1], ['mar', 2], ['apr', 3], ['may', 4],
      ['jun', 5], ['jul', 6], ['aug', 7], ['sep', 8], ['oct', 9],
      ['nov', 10], ['dec', 11],
    ];
    for (const [name, monthIdx] of months) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const m = t.toLowerCase().match(new RegExp(`(\\d{1,2})\\s*${escaped}`));
      if (m) {
        return new Date(now.getFullYear(), monthIdx, parseInt(m[1], 10), hh, mm);
      }
    }

    if (/พรุ่งนี้|tomorrow/i.test(t)) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hh, mm);
    }
    if (/วันนี้|today/i.test(t)) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm);
    }
    if (timeMatch) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm);
      if (d.getTime() < now.getTime()) d.setDate(d.getDate() + 1);
      return d;
    }
    return null;
  }

  /**
   * Consume one answer in the create-convoy conversation. Returns true if the
   * message was part of an in-progress flow (so the caller should stop).
   */
  private async handlePendingCreate(
    lineUserId: string,
    text: string,
    lang: 'th' | 'en',
    replyToken: string | undefined,
    replies: MarshalMessage[],
  ): Promise<boolean> {
    const pending = this.pendingCreates.get(lineUserId);
    if (!pending) return false;

    if (pending.step === 'name') {
      pending.name = text.trim();
      pending.step = 'destination';
      const ask = this.marshal.createAskDestination(lang);
      replies.push(ask);
      await this.replyText(replyToken, ask.text);
      return true;
    }
    if (pending.step === 'destination') {
      pending.destination = { lat: 13.7563, lng: 100.5018, label: text.trim() };
      pending.step = 'time';
      const ask = this.marshal.createAskTime(lang);
      replies.push(ask);
      await this.replyText(replyToken, ask.text);
      return true;
    }
    if (pending.step === 'time') {
      const time = this.parseArrival(text);
      if (!time) {
        const ask = this.marshal.createAskTime(lang);
        replies.push(ask);
        await this.replyText(replyToken, ask.text);
        return true;
      }
      const uid = this.ensureUser(lineUserId);
      const displayName = this.store.users.get(uid)?.displayName ?? 'สมาชิกขบวน';
      const { code } = this.createTripFromLine(
        uid,
        displayName,
        pending.name ?? 'ขบวน',
        pending.destination ?? { lat: 13.7563, lng: 100.5018, label: '' },
        time,
      );
      this.pendingCreates.delete(lineUserId);
      const done = this.marshal.createDone(pending.name ?? 'ขบวน', code, lang);
      replies.push(done);
      await this.replyText(replyToken, done.text, this.menuButtons(lang));
      return true;
    }
    return false;
  }

  /**
   * Verify LINE Messaging API webhook signature.
   * Hook is always present; in demo mode missing secret accepts with warning.
   */
  verifySignature(
    rawBody: Buffer | string,
    signatureHeader: string | undefined,
  ): boolean {
    const secret = this.config.get<string>('LINE_CHANNEL_SECRET');
    const mode = this.config.get<string>('AUTH_MODE', 'demo');

    if (!secret) {
      if (mode === 'demo') {
        this.logger.warn('LINE_CHANNEL_SECRET unset — demo webhook accepted');
        return true;
      }
      throw new BadRequestException('LINE channel secret not configured');
    }

    if (!signatureHeader) return false;

    const body =
      typeof rawBody === 'string' ? Buffer.from(rawBody) : rawBody;
    const digest = createHmac('sha256', secret)
      .update(body)
      .digest('base64');

    try {
      const a = Buffer.from(digest);
      const b = Buffer.from(signatureHeader);
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  /** Detect reply language: Thai if any Thai chars, else English. */
  detectLang(text: string): 'th' | 'en' {
    return /[\u0E00-\u0E7F]/.test(text) ? 'th' : 'en';
  }

  /**
   * Turn a recognized chat command into the marshal's friendly reply.
   * Accepts both Thai and English; replies in the same language as the input.
   */
  personaReply(text: string, lang: 'th' | 'en' = 'th'): MarshalMessage | null {
    const t = text.trim().toLowerCase();
    if (/ถึงแล้ว|ถึงอนุสาวรีย์|ปิดท้ายถึง|^ถึง$|arrived|arrive|arrival|reached|made it|i'?m here/i.test(t)) {
      return this.marshal.confirmArrival(lang);
    }
    if (/ออกแล้ว|ออกตัว|รถนำออก|departed|departing|departure|heading out|leaving|i'?m out/i.test(t)) {
      return this.marshal.confirmDeparture(lang);
    }
    if (/พักปั๊ม|แวะปั๊ม|fuel stop|pit stop|gas station|rest stop|refuel/i.test(t)) {
      return this.marshal.confirmPitStop(lang);
    }
    if (/หลงทาง|หาไม่เจอ|หลง|lost|can'?t find|i'?m lost/i.test(t)) {
      return this.marshal.helpLost(lang);
    }
    return null;
  }

  /**
   * Bind a LINE group to a trip — นำขบวน becomes a member of that group and
   * reports status into it from now on.
   */
  private bindGroup(tripId: string, groupId: string): boolean {
    const trip = this.store.trips.get(tripId);
    if (!trip) return false;
    trip.lineGroupId = groupId;
    trip.updatedAt = new Date();
    return true;
  }

  /**
   * Resolve a bind code → trip id. Accepts the full UUID or a short prefix
   * (the first N chars of the id, case-insensitive) — the "locked format"
   * that keeps the group bind easy to type.
   */
  private resolveTripId(code: string): string | null {
    const c = code.trim().toUpperCase();
    if (!c) return null;
    if (this.store.trips.has(code)) return code;
    if (this.store.trips.has(c)) return c;
    const matches = [...this.store.trips.keys()].filter((id) =>
      id.toUpperCase().startsWith(c),
    );
    return matches.length === 1 ? matches[0] : null;
  }

  /** Current convoy status for a bound group (or "not bound" if none). */
  private statusReply(
    groupId: string | null,
    lang: 'th' | 'en' = 'th',
  ): MarshalMessage {
    if (!groupId) return this.marshal.notBound(lang);
    const trip = [...this.store.trips.values()].find(
      (t) => t.lineGroupId === groupId,
    );
    if (!trip) return this.marshal.notBound(lang);
    let arrived = 0;
    let enroute = 0;
    let departed = 0;
    for (const p of this.store.participants.values()) {
      if (p.tripId !== trip.id) continue;
      if (p.arrivalStatus === 'CONFIRMED') arrived++;
      else if (p.sharingState === 'ACTIVE' || p.sharingState === 'PAUSED')
        enroute++;
      else departed++;
    }
    return this.marshal.statusReply(arrived, enroute, departed, lang);
  }

  async handleWebhookEvents(body: {
    destination?: string;
    events?: unknown[];
  }): Promise<{ received: number; wakes: WakeKind[]; replies: MarshalMessage[] }> {
    const events = body.events ?? [];
    const wakes: WakeKind[] = [];
    const replies: MarshalMessage[] = [];

    for (const raw of events) {
      const event = raw as {
        type?: string;
        replyToken?: string;
        message?: {
          type?: string;
          text?: string;
          latitude?: number;
          longitude?: number;
          address?: string;
        };
        source?: { type?: string; groupId?: string; roomId?: string; userId?: string };
      };
      const groupId = event.source?.groupId ?? event.source?.roomId ?? null;
      const replyToken = event.replyToken;

      // นำขบวน was added to a group → introduce itself.
      if (event.type === 'join' || event.type === 'memberJoined') {
        if (groupId) {
          const greeting = this.marshal.joinGreeting();
          replies.push(greeting);
          await this.lineClient.push(groupId, [
            {
              type: 'text',
              text: greeting.text,
              quickReply: this.lineClient.quickReply([
                'เมนู',
                'เช็คขบวน',
                'ถึงแล้ว',
                'ออกตัว',
              ]),
            },
          ]);
        }
        continue;
      }

      if (event.type !== 'message') continue;
      const msg = event.message;
      const userId = event.source?.userId ?? null;

      // Location share → destination step of the create flow.
      if (msg?.type === 'location' && userId) {
        const pending = this.pendingCreates.get(userId);
        if (pending?.step === 'destination') {
          pending.destination = {
            lat: msg.latitude ?? 13.7563,
            lng: msg.longitude ?? 100.5018,
            label: msg.address ?? 'จุดหมาย',
          };
          pending.step = 'time';
          const ask = this.marshal.createAskTime('th');
          replies.push(ask);
          await this.replyText(replyToken, ask.text);
        }
        continue;
      }

      if (msg?.type !== 'text') continue;
      const text = msg.text ?? '';
      const mode = inferMode(event);
      const lang = this.detectLang(text);

      // Ongoing create flow → consume this answer.
      if (userId && (await this.handlePendingCreate(userId, text, lang, replyToken, replies))) {
        continue;
      }

      // Create a convoy from chat.
      if (/^(สร้างขบวน|สร้างทริป|create|new trip)$/i.test(text.trim())) {
        if (userId) {
          this.pendingCreates.set(userId, { step: 'name', name: null, destination: null });
        }
        const start = this.marshal.createStart(lang);
        replies.push(start);
        await this.replyText(replyToken, start.text);
        continue;
      }

      // Cancel the create flow.
      if (/^(ยกเลิก|cancel)$/i.test(text.trim())) {
        if (userId && this.pendingCreates.delete(userId)) {
          const cancelled = this.marshal.createCancelled(lang);
          replies.push(cancelled);
          await this.replyText(replyToken, cancelled.text);
        }
        continue;
      }

      // Bind: "ผูกขบวน" alone → (group) offer trips as buttons; (DM) explain group need.
      if (/^(ผูกขบวน|bind|#ขบวน\s*ผูก)$/i.test(text.trim())) {
        if (!groupId) {
          const needGroup = this.marshal.bindNeedGroup(lang);
          replies.push(needGroup);
          await this.replyText(replyToken, needGroup.text);
          continue;
        }
        if (userId) {
          const uid = this.ensureUser(userId);
          const trips = this.myTrips(uid);
          if (trips.length === 0) {
            const none = this.marshal.myTripsNone(lang);
            replies.push(none);
            await this.replyText(replyToken, none.text);
          } else {
            const pick = this.marshal.bindPick(lang);
            const buttons = trips.slice(0, 10).map((t) => ({
              label: t.title.slice(0, 20),
              text: `ผูกขบวน ${t.id.slice(0, 6).toUpperCase()}`,
            }));
            replies.push(pick);
            await this.replyTextPairs(replyToken, pick.text, buttons);
          }
        }
        continue;
      }

      const bind = BIND_RE.exec(text);
      const code = bind?.[1] ?? bind?.[2] ?? bind?.[3];
      if (code) {
        if (!groupId) {
          const needGroup = this.marshal.bindNeedGroup(lang);
          replies.push(needGroup);
          await this.replyText(replyToken, needGroup.text);
          continue;
        }
        const tripId = this.resolveTripId(code);
        if (!tripId) {
          const nf = this.marshal.bindNotFound(lang);
          replies.push(nf);
          await this.replyText(replyToken, nf.text);
          continue;
        }
        this.bindGroup(tripId, groupId);
        const confirm = this.marshal.bindConfirm();
        replies.push(confirm);
        await this.replyText(replyToken, confirm.text, this.menuButtons(lang));
        continue;
      }

      // Chat-as-interface: the marshal answers recognized commands (both group & dm).
      const reply = this.personaReply(text, lang);
      if (reply) {
        replies.push(reply);
        await this.replyText(replyToken, reply.text, this.menuButtons(lang));
        continue;
      }

      // Keyword wake (group stays keyword-only unless #ขบวน).
      const hit = text ? parseWake(text, mode) : null;
      if (hit) {
        wakes.push(hit.kind);
        const wakeReply =
          hit.kind === 'status'
            ? this.statusReply(groupId, lang)
            : hit.kind === 'help'
              ? this.marshal.help(lang)
              : null;
        if (wakeReply) {
          replies.push(wakeReply);
          await this.replyText(replyToken, wakeReply.text, this.menuButtons(lang));
        }
        continue;
      }

      // Fallback: nothing recognized → offer the menu. DM always; group only when addressed.
      const addressed =
        mode === 'dm' || /#ขบวน|#convoy|\bขบวน\b|mcg\s*convoy/i.test(text);
      if (addressed) {
        const help = this.marshal.help(lang);
        replies.push(help);
        await this.replyText(replyToken, help.text, this.menuButtons(lang));
      }
    }

    this.logger.log(
      `LINE webhook received ${events.length} event(s), ${wakes.length} wake(s)`,
    );
    return { received: events.length, wakes, replies };
  }
}
