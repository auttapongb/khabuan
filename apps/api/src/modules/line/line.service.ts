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
import { BKK_OFFSET_MS, nextTripCode } from '../../infrastructure/memory/trip-code';

/** ผูกขบวน <code> / #ขบวน ผูก <code> / bind <code> (code = full UUID, short prefix, or DDMMYYYY-XX) */
const BIND_RE =
  /ผูกขบวน\s+([0-9a-zA-Z-]{4,})|#ขบวน\s*ผูก\s*([0-9a-zA-Z-]{4,})|bind\s+([0-9a-zA-Z-]{4,})/i;

/** Single source of truth for chat status commands (shared by reply + persist). */
const ARRIVAL_RE = /ถึงแล้ว|arrived|arrive|reached|made it|i'?m here/i;
const DEPARTURE_RE = /ออกตัว|ออกแล้ว|departed|departing|heading out|leaving|i'?m out/i;
const PITSTOP_RE = /แวะปั๊ม|พักปั๊ม|pit stop|fuel stop|gas station|refuel|rest stop/i;
const LOST_RE = /หลงทาง|หาไม่เจอ|lost|can'?t find|i'?m lost/i;
const RESUME_RE =
  /ไปต่อ|เข้าทาง|กลับมาแล้ว|กลับเข้ารูป|กลับเส้นทาง|back on track|found my way|resume|on my way again|heading out again/i;
const NEGATION_RE = /ไม่ถึง|ยังไม่ถึง|ไม่ออก|ยังไม่ออก|ไม่แวะ|ไม่หลง/;

interface PendingCreate {
  step: 'name' | 'destination' | 'time';
  name: string | null;
  destination: { lat: number; lng: number; label: string } | null;
  lang: 'th' | 'en';
  startedAt: number;
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

  /** Reply to "หลงทาง" with the trip's destination pin + reassurance. */
  private async replyLost(
    replyToken: string | undefined,
    text: string,
    groupId: string | null,
    lang: 'th' | 'en',
  ): Promise<void> {
    if (!replyToken) return;
    const trip = groupId ? this.boundTrip(groupId) : null;
    const dest = trip?.destination as { lat?: number; lng?: number } | undefined;
    if (dest && typeof dest.lat === 'number' && typeof dest.lng === 'number') {
      const label = (trip?.notes as string | undefined)?.trim();
      await this.lineClient.reply(replyToken, [
        {
          type: 'location',
          title: 'จุดหมายปลายทาง',
          address: label || 'จุดหมายปลายทาง',
          latitude: dest.lat,
          longitude: dest.lng,
        },
        { type: 'text', text, quickReply: this.lineClient.quickReply(this.menuButtons(lang)) },
      ]);
    } else {
      await this.replyText(replyToken, text, this.menuButtons(lang));
    }
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

  /** Cache of LINE display names by LINE user id. */
  private readonly profileNames = new Map<string, string>();

  /** Recently-seen webhook event ids (dedupes LINE redeliveries). */
  private readonly seenEventIds = new Set<string>();

  /** Best-effort resolve a LINE user's display name (cached). */
  private async resolveDisplayName(lineUserId: string): Promise<string> {
    const cached = this.profileNames.get(lineUserId);
    if (cached) return cached;
    const profile = await this.lineClient.getProfile(lineUserId).catch(() => null);
    const name = profile?.displayName?.trim();
    if (name) {
      this.profileNames.set(lineUserId, name);
      return name;
    }
    return 'สมาชิกขบวน';
  }

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
    const code = nextTripCode(
      [...this.store.trips.values()].map((t) => t.code),
      now,
    );
    this.store.trips.set(id, {
      id,
      code,
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
    return { id, code };
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

  /** Build a Date for a Bangkok wall-clock time (UTC+7) as a UTC instant. */
  private bangkokDate(
    y: number,
    mo: number,
    d: number,
    hh: number,
    mm: number,
  ): Date {
    return new Date(Date.UTC(y, mo, d, hh, mm) - BKK_OFFSET_MS);
  }

  /** Parse a Thai/English date-time string into a Date (Bangkok time), or null. */
  private parseArrival(text: string): Date | null {
    const t = text.trim();
    const nowBkk = new Date(Date.now() + BKK_OFFSET_MS);
    const y = nowBkk.getUTCFullYear();
    const mo = nowBkk.getUTCMonth();
    const d = nowBkk.getUTCDate();
    const timeMatch = t.match(/(\d{1,2}):(\d{2})/);
    const hh = timeMatch ? parseInt(timeMatch[1], 10) : 9;
    const mm = timeMatch ? parseInt(timeMatch[2], 10) : 0;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;

    // DD/MM or DD/MM/YYYY
    const dateMatch = t.match(/(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{4}))?/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1;
      const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : y;
      if (month < 0 || month > 11 || day < 1 || day > 31) return null;
      return this.bangkokDate(year, month, day, hh, mm);
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
        return this.bangkokDate(y, monthIdx, parseInt(m[1], 10), hh, mm);
      }
    }

    if (/พรุ่งนี้|tomorrow/i.test(t)) {
      return this.bangkokDate(y, mo, d + 1, hh, mm);
    }
    if (/วันนี้|today/i.test(t)) {
      return this.bangkokDate(y, mo, d, hh, mm);
    }
    if (timeMatch) {
      const parsed = this.bangkokDate(y, mo, d, hh, mm);
      if (parsed.getTime() < Date.now()) {
        return this.bangkokDate(y, mo, d + 1, hh, mm);
      }
      return parsed;
    }
    return null;
  }

  /** Geocode a free-text place name via OSM Nominatim (open-source, no key). */
  private async geocode(
    place: string,
  ): Promise<{ lat: number; lng: number; label: string } | null> {
    const q = encodeURIComponent(place.trim());
    if (!q) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=th&q=${q}`,
        {
          headers: { 'User-Agent': 'khabuan-convoy-bot/1.0 (LINE convoy tracker)' },
          signal: controller.signal,
        },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        lat?: string;
        lon?: string;
        display_name?: string;
      }[];
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        const lat = parseFloat(first.lat ?? '');
        const lng = parseFloat(first.lon ?? '');
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          return {
            lat,
            lng,
            label: first.display_name?.split(',')[0] ?? place.trim(),
          };
        }
      }
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
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

    // Stale flow (left hanging > 15 min) → drop it so normal commands work again.
    if (Date.now() - pending.startedAt > 15 * 60 * 1000) {
      this.pendingCreates.delete(lineUserId);
      return false;
    }
    lang = pending.lang;

    // Allow cancel at any step of the create flow.
    if (/^(ยกเลิก|cancel)$/i.test(text.trim())) {
      this.pendingCreates.delete(lineUserId);
      const cancelled = this.marshal.createCancelled(lang);
      replies.push(cancelled);
      await this.replyText(replyToken, cancelled.text);
      return true;
    }

    if (pending.step === 'name') {
      pending.name = text.trim();
      pending.step = 'destination';
      const ask = this.marshal.createAskDestination(lang);
      replies.push(ask);
      await this.replyText(replyToken, ask.text);
      return true;
    }
    if (pending.step === 'destination') {
      const geo = await this.geocode(text.trim());
      pending.destination = geo
        ? { lat: geo.lat, lng: geo.lng, label: geo.label }
        : { lat: 13.7563, lng: 100.5018, label: text.trim() };
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
      const displayName = await this.resolveDisplayName(lineUserId);
      const user = this.store.users.get(uid);
      if (
        user &&
        user.displayName === 'สมาชิกขบวน' &&
        displayName !== 'สมาชิกขบวน'
      ) {
        user.displayName = displayName;
      }
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
    if (NEGATION_RE.test(t)) return null;
    if (ARRIVAL_RE.test(t)) return this.marshal.confirmArrival(lang);
    if (DEPARTURE_RE.test(t)) return this.marshal.confirmDeparture(lang);
    if (RESUME_RE.test(t)) return this.marshal.confirmResume(lang);
    if (PITSTOP_RE.test(t)) return this.marshal.confirmPitStop(lang);
    if (LOST_RE.test(t)) return this.marshal.helpLost(lang);
    return null;
  }

  /**
   * Bind a LINE group to a trip — นำขบวน becomes a member of that group and
   * reports status into it from now on.
   */
  private bindGroup(
    tripId: string,
    groupId: string,
  ): 'bound' | 'already' | 'conflict' | 'missing' {
    const trip = this.store.trips.get(tripId);
    if (!trip) return 'missing';
    if (trip.lineGroupId === groupId) return 'already';
    if (trip.lineGroupId && trip.lineGroupId !== groupId) return 'conflict';
    trip.lineGroupId = groupId;
    trip.updatedAt = new Date();
    return 'bound';
  }

  /**
   * Resolve a bind code → trip id. Accepts the full UUID or a short prefix
   * (the first N chars of the id, case-insensitive) — the "locked format"
   * that keeps the group bind easy to type.
   */
  private resolveTripId(code: string): string | 'ambiguous' | null {
    const c = code.trim().toUpperCase();
    if (!c) return null;
    // Exact memorable-code match (DDMMYYYY-XX) — highest priority.
    const byCode = [...this.store.trips.values()].find(
      (t) => t.code && t.code.toUpperCase() === c,
    );
    if (byCode) return byCode.id;
    // Exact UUID match.
    if (this.store.trips.has(code)) return code;
    if (this.store.trips.has(c)) return c;
    // Short prefix match on the UUID.
    const matches = [...this.store.trips.keys()].filter((id) =>
      id.toUpperCase().startsWith(c),
    );
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) return 'ambiguous';
    return null;
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
    let total = 0;
    for (const p of this.store.participants.values()) {
      if (p.tripId !== trip.id) continue;
      total++;
      if (p.arrivalStatus === 'CONFIRMED') arrived++;
    }
    return this.marshal.statusReply(arrived, total, lang);
  }

  /** The trip bound to a group, or null. */
  private boundTrip(groupId: string | null): TripRecord | null {
    if (!groupId) return null;
    return (
      [...this.store.trips.values()].find((t) => t.lineGroupId === groupId) ??
      null
    );
  }

  /** Find or create a participant for (trip, user). */
  private ensureParticipant(tripId: string, userId: string): void {
    const key = `${tripId}:${userId}`;
    if (this.store.participants.has(key)) return;
    const now = new Date();
    this.store.participants.set(key, {
      id: randomUUID(),
      tripId,
      userId,
      vehicleId: null,
      role: 'MEMBER' as never,
      sharingState: 'OFF' as never,
      arrivalStatus: 'NONE' as never,
      arrivedAt: null,
      visibility: 'exact',
      joinedAt: now,
      updatedAt: now,
      geofenceEnteredAt: null,
    });
  }

  /**
   * Persist a chat status command against the group's bound trip so that
   * "เช็คขบวน" reports real numbers. No-ops outside a bound group. Mirrors
   * the regexes in personaReply().
   */
  private recordStatus(
    text: string,
    groupId: string | null,
    userId: string | null,
  ): void {
    if (!groupId || !userId) return;
    const trip = this.boundTrip(groupId);
    if (!trip) return;
    const uid = this.ensureUser(userId);
    this.ensureParticipant(trip.id, uid);
    const p = this.store.participants.get(`${trip.id}:${uid}`);
    if (!p) return;
    const t = text.trim().toLowerCase();
    if (NEGATION_RE.test(t)) return;
    const now = new Date();
    if (ARRIVAL_RE.test(t)) {
      p.arrivalStatus = 'CONFIRMED' as never;
      p.arrivedAt = p.arrivedAt ?? now;
    } else if (DEPARTURE_RE.test(t) || RESUME_RE.test(t)) {
      p.sharingState = 'ACTIVE' as never;
      p.arrivalStatus = 'NONE' as never;
      p.arrivedAt = null;
    } else if (PITSTOP_RE.test(t)) {
      p.sharingState = 'PAUSED' as never;
    }
    p.updatedAt = now;
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
        webhookEventId?: string;
        message?: {
          type?: string;
          text?: string;
          latitude?: number;
          longitude?: number;
          address?: string;
        };
        source?: { type?: string; groupId?: string; roomId?: string; userId?: string };
      };
      // Dedupe redelivered events (LINE re-sends the same webhookEventId on timeout/retry).
      const eventId = event.webhookEventId;
      if (eventId) {
        if (this.seenEventIds.has(eventId)) continue;
        this.seenEventIds.add(eventId);
        if (this.seenEventIds.size > 5000) {
          const oldest = this.seenEventIds.values().next().value;
          if (oldest) this.seenEventIds.delete(oldest);
        }
      }
      const groupId = event.source?.groupId ?? event.source?.roomId ?? null;
      const replyToken = event.replyToken;

      // นำขบวน was added to a group → introduce itself ONCE (join event only).
      // memberJoined (other people joining) must NOT re-trigger the full intro —
      // otherwise adding the bot + members together produces duplicate greetings.
      if (event.type === 'join') {
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
          const ask = this.marshal.createAskTime(pending.lang);
          replies.push(ask);
          await this.replyText(replyToken, ask.text);
        }
        continue;
      }

      if (msg?.type !== 'text') continue;
      // Accept slash-prefixed commands (/ผูกขบวน, /เช็คขบวน, /นำขบวน, /check …).
      const text = (msg.text ?? '').replace(/^\s*\//, '');
      const mode = inferMode(event);
      const lang = this.detectLang(text);

      // Ongoing create flow → consume this answer.
      if (userId && (await this.handlePendingCreate(userId, text, lang, replyToken, replies))) {
        continue;
      }

      // Create a convoy from chat.
      if (/^(สร้างขบวน|สร้างทริป|create|new trip)$/i.test(text.trim())) {
        if (userId) {
          this.pendingCreates.set(userId, {
            step: 'name',
            name: null,
            destination: null,
            lang,
            startedAt: Date.now(),
          });
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
              text: `ผูกขบวน ${t.code ?? t.id.slice(0, 6).toUpperCase()}`,
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
        if (tripId === 'ambiguous') {
          const amb = this.marshal.bindAmbiguous(lang);
          replies.push(amb);
          await this.replyText(replyToken, amb.text);
          continue;
        }
        if (!tripId) {
          const nf = this.marshal.bindNotFound(lang);
          replies.push(nf);
          await this.replyText(replyToken, nf.text);
          continue;
        }
        const result = this.bindGroup(tripId, groupId);
        const msg =
          result === 'bound'
            ? this.marshal.bindConfirm()
            : result === 'already'
              ? this.marshal.bindAlready(lang)
              : this.marshal.bindConflict(lang);
        replies.push(msg);
        await this.replyText(replyToken, msg.text, this.menuButtons(lang));
        continue;
      }

      // Chat-as-interface: the marshal answers recognized commands (both group & dm).
      const reply = this.personaReply(text, lang);
      if (reply) {
        if (!groupId) {
          const needGroup = this.marshal.statusNeedGroup(lang);
          replies.push(needGroup);
          await this.replyText(replyToken, needGroup.text);
          continue;
        }
        this.recordStatus(text, groupId, userId);
        replies.push(reply);
        if (LOST_RE.test(text.trim().toLowerCase())) {
          await this.replyLost(replyToken, reply.text, groupId, lang);
        } else {
          await this.replyText(replyToken, reply.text, this.menuButtons(lang));
        }
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
