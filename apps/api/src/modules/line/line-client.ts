import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type LineQuickReplyAction = { type: 'message'; label: string; text: string };
export type LineQuickReply = {
  items: { type: 'action'; action: LineQuickReplyAction }[];
};
export type LineTextMessage = {
  type: 'text';
  text: string;
  quickReply?: LineQuickReply;
};

/**
 * Thin client for the LINE Messaging API (Bot).
 *
 * Two primitives match the two jobs of the นำขบวน group member:
 *   - reply()  — answer a message someone just sent (replyToken, single-shot)
 *   - push()   — send a proactive notification/status to a group or user
 *
 * Raw fetch, no SDK — same dependency-free approach as the signature check.
 * In demo mode (no LINE_CHANNEL_ACCESS_TOKEN) every call is a no-op that logs,
 * so the rest of the app stays testable without LINE credentials.
 */
@Injectable()
export class LineClient {
  private readonly logger = new Logger(LineClient.name);
  private readonly base = 'https://api.line.me/v2/bot';

  constructor(private readonly config: ConfigService) {}

  private get token(): string | undefined {
    return this.config.get<string>('LINE_CHANNEL_ACCESS_TOKEN');
  }

  get enabled(): boolean {
    return !!this.token;
  }

  /** Answer a message in a chat/group. replyToken is single-use. */
  async reply(replyToken: string, messages: LineTextMessage[]): Promise<void> {
    await this.post('/message/reply', { replyToken, messages });
  }

  /** Send a proactive message to a group/user/room id. */
  async push(to: string, messages: LineTextMessage[]): Promise<void> {
    await this.post('/message/push', { to, messages });
  }

  /** Convenience: push a single text line. */
  async pushText(to: string, text: string): Promise<void> {
    await this.push(to, [{ type: 'text', text }]);
  }

  /** Fetch a user's LINE profile (display name). Null on failure/no token. */
  async getProfile(userId: string): Promise<{ displayName?: string } | null> {
    if (!this.token) return null;
    try {
      const res = await fetch(`${this.base}/profile/${userId}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as { displayName?: string };
    } catch {
      return null;
    }
  }

  /** Build a quick-reply button bar (tappable message actions) from labels. */
  quickReply(labels: string[]): LineQuickReply {
    return {
      items: labels.map((label) => ({
        type: 'action',
        action: { type: 'message', label, text: label },
      })),
    };
  }

  /** Quick replies where the shown label differs from the text it sends. */
  quickReplyPairs(items: { label: string; text: string }[]): LineQuickReply {
    return {
      items: items.map(({ label, text }) => ({
        type: 'action',
        action: { type: 'message', label, text },
      })),
    };
  }

  private async post(path: string, body: unknown): Promise<void> {
    if (!this.token) {
      this.logger.warn(
        `LINE ${path} skipped — LINE_CHANNEL_ACCESS_TOKEN not set (demo mode)`,
      );
      return;
    }
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(`LINE ${path} network error: ${String(err)}`);
      return;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`LINE ${path} failed ${res.status}: ${text.slice(0, 300)}`);
    }
  }
}
