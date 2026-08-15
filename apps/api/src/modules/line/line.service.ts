import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { inferMode, parseWake, type WakeKind } from './wake';
import { MarshalService, MarshalMessage } from './marshal.service';

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly marshal: MarshalService,
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

  handleWebhookEvents(body: {
    destination?: string;
    events?: unknown[];
  }): { received: number; wakes: WakeKind[]; replies: MarshalMessage[] } {
    const events = body.events ?? [];
    const wakes: WakeKind[] = [];
    const replies: MarshalMessage[] = [];
    for (const event of events) {
      const text = extractText(event);
      const hit = text ? parseWake(text, inferMode(event)) : null;
      if (hit) {
        wakes.push(hit.kind);
        this.logger.log(
          `Wake ${hit.kind} (${inferMode(event)}) — group stays keyword-only`,
        );
        // Chat-as-interface: the marshal answers recognized commands.
        const reply = this.personaReply(text ?? '');
        if (reply) replies.push(reply);
      }
    }
    this.logger.log(
      `LINE webhook received ${events.length} event(s), ${wakes.length} wake(s)`,
    );
    return { received: events.length, wakes, replies };
  }
}

function extractText(event: unknown): string | null {
  if (!event || typeof event !== 'object') return null;
  const rec = event as { type?: string; message?: { type?: string; text?: string } };
  if (rec.type !== 'message' || rec.message?.type !== 'text') return null;
  return rec.message.text ?? null;
}
