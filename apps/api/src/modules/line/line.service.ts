import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { inferMode, parseWake, type WakeKind } from './wake';
import { MarshalService, MarshalMessage } from './marshal.service';
import { LineClient, type LineTextMessage } from './line-client';
import { MemoryStore } from '../../infrastructure/memory/memory.store';

/** ผูกขบวน <tripId> / #ขบวน ผูก <tripId> / bind <tripId> */
const BIND_RE =
  /ผูกขบวน\s+([0-9a-fA-F-]{8,})|#ขบวน\s*ผูก\s*([0-9a-fA-F-]{8,})|bind\s+([0-9a-fA-F-]{8,})/i;

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

  /** The main command menu as quick-reply buttons, in the reply language. */
  private menuButtons(lang: 'th' | 'en'): string[] {
    return lang === 'en'
      ? ['Check', 'Arrived', 'Departed', 'Pit stop', 'Lost']
      : ['เช็คขบวน', 'ถึงแล้ว', 'ออกตัว', 'แวะปั๊ม', 'หลงทาง'];
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
        message?: { type?: string; text?: string };
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

      if (event.type !== 'message' || event.message?.type !== 'text') continue;
      const text = event.message.text ?? '';
      const mode = inferMode(event);
      const lang = this.detectLang(text);

      // Bind command: ผูกขบวน <tripId> in the group.
      const bind = BIND_RE.exec(text);
      const tripId = bind?.[1] ?? bind?.[2] ?? bind?.[3];
      if (tripId && groupId) {
        const ok = this.bindGroup(tripId, groupId);
        const confirm = ok
          ? this.marshal.bindConfirm()
          : this.marshal.message('lost', {}); // reuse a friendly "no worries" line
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
