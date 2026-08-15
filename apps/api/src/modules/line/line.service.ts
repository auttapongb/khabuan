import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { inferMode, parseWake, type WakeKind } from './wake';
import { MarshalService, MarshalMessage } from './marshal.service';
import { LineClient } from './line-client';
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

  /**
   * Turn a recognized chat command into the marshal's friendly Thai reply.
   * This is the chat-as-interface loop: type "ถึงแล้ว" → พี่นำขบวน answers.
   */
  personaReply(text: string): MarshalMessage | null {
    const t = text.trim().toLowerCase();
    if (/ถึงแล้ว|ถึงอนุสาวรีย์|ปิดท้ายถึง|^ถึง$/.test(t)) {
      return this.marshal.confirmArrival();
    }
    if (/ออกแล้ว|ออกตัว|รถนำออก/.test(t)) {
      return this.marshal.confirmDeparture();
    }
    if (/พักปั๊ม|แวะปั๊ม|fuel stop/.test(t)) {
      return this.marshal.confirmPitStop();
    }
    if (/หลงทาง|หลง|หาไม่เจอ/.test(t)) {
      return this.marshal.helpLost();
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
          await this.lineClient.pushText(groupId, greeting.text);
        }
        continue;
      }

      if (event.type !== 'message' || event.message?.type !== 'text') continue;
      const text = event.message.text ?? '';
      const mode = inferMode(event);

      // Bind command: ผูกขบวน <tripId> in the group.
      const bind = BIND_RE.exec(text);
      const tripId = bind?.[1] ?? bind?.[2] ?? bind?.[3];
      if (tripId && groupId) {
        const ok = this.bindGroup(tripId, groupId);
        const confirm = ok
          ? this.marshal.bindConfirm()
          : this.marshal.message('lost', {}); // reuse a friendly "no worries" line
        replies.push(confirm);
        if (replyToken) {
          await this.lineClient.reply(replyToken, [{ type: 'text', text: confirm.text }]);
        }
        continue;
      }

      // Chat-as-interface: the marshal answers recognized commands (both group & dm).
      const reply = this.personaReply(text);
      if (reply) {
        replies.push(reply);
        if (replyToken) {
          await this.lineClient.reply(replyToken, [{ type: 'text', text: reply.text }]);
        }
      }

      // Keyword wake (group stays keyword-only unless #ขบวน).
      const hit = text ? parseWake(text, mode) : null;
      if (hit) wakes.push(hit.kind);
    }

    this.logger.log(
      `LINE webhook received ${events.length} event(s), ${wakes.length} wake(s)`,
    );
    return { received: events.length, wakes, replies };
  }
}
