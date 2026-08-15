import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import { MemoryStore } from '../../infrastructure/memory/memory.store';
import { UserRecord } from '../../infrastructure/memory/types';

export interface SessionResult {
  userId: string;
  displayName: string;
  locale: string;
  token: string;
  accessToken: string;
  expiresAt: string;
  user: {
    id: string;
    displayName: string;
    role: 'organizer' | 'member' | 'admin';
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly store: MemoryStore,
  ) {}

  async exchangeLine(idToken: string, _nonce?: string): Promise<SessionResult> {
    const mode = this.config.get<string>('AUTH_MODE', 'demo');

    let profile: { sub: string; name: string; locale?: string };

    if (mode === 'demo') {
      profile = this.parseDemoToken(idToken);
    } else {
      profile = await this.verifyLineIdToken(idToken);
    }

    // Reuse seeded users by lineSubject (demo-organizer / demo-member) — never duplicate
    const user = [...this.store.users.values()].find(
      (u) => u.lineSubject === profile.sub,
    );
    if (!user) {
      const now = new Date();
      const created: UserRecord = {
        id: randomUUID(),
        lineSubject: profile.sub,
        displayName: profile.name,
        status: 'ACTIVE',
        locale: profile.locale ?? 'en',
        isAdmin: false,
        isTestAccount: mode === 'demo',
        createdAt: now,
        updatedAt: now,
      };
      this.store.users.set(created.id, created);
      return this.issueSession(created);
    }

    return this.issueSession(user);
  }

  issueSession(user: UserRecord): SessionResult {
    const expiresIn = (this.config.get<string>('JWT_EXPIRES_IN', '7d') ??
      '7d') as `${number}d`;
    const token = this.jwt.sign(
      {
        sub: user.id,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
      },
      { expiresIn },
    );
    const expiresAt = new Date(Date.now() + parseExpiresMs(expiresIn));
    const role = this.resolveRole(user);
    return {
      userId: user.id,
      displayName: user.displayName,
      locale: user.locale,
      token,
      accessToken: token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        displayName: user.displayName,
        role,
      },
    };
  }

  private resolveRole(
    user: UserRecord,
  ): 'organizer' | 'member' | 'admin' {
    if (user.lineSubject === 'demo-organizer') return 'organizer';
    if (user.isAdmin) return 'admin';
    const ownsClub = [...this.store.clubs.values()].some(
      (c) => c.ownerId === user.id,
    );
    if (ownsClub) return 'organizer';
    return 'member';
  }

  private parseDemoToken(idToken: string): {
    sub: string;
    name: string;
    locale?: string;
  } {
    // Accept: "demo", "demo:organizer", "demo:member", or JWT-like base64 payload
    if (idToken === 'demo' || idToken === 'demo:organizer') {
      return { sub: 'demo-organizer', name: 'Demo Organizer', locale: 'en' };
    }
    if (idToken === 'demo:member') {
      return { sub: 'demo-member', name: 'Demo Member', locale: 'en' };
    }
    if (idToken.startsWith('demo:')) {
      const name = idToken.slice(5) || 'Demo User';
      return {
        sub: `demo-${createHash('sha256').update(name).digest('hex').slice(0, 12)}`,
        name,
        locale: 'en',
      };
    }
    throw new UnauthorizedException(
      'AUTH_MODE=demo accepts idToken "demo", "demo:organizer", "demo:member", or "demo:<name>"',
    );
  }

  private async verifyLineIdToken(idToken: string): Promise<{
    sub: string;
    name: string;
    locale?: string;
  }> {
    const channelId = this.config.get<string>('LINE_LOGIN_CHANNEL_ID');
    if (!channelId) {
      throw new BadRequestException('LINE_LOGIN_CHANNEL_ID not configured');
    }
    // LINE verify endpoint
    const body = new URLSearchParams({
      id_token: idToken,
      client_id: channelId,
    });
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      throw new UnauthorizedException('LINE id_token verification failed');
    }
    const data = (await res.json()) as {
      sub: string;
      name?: string;
      locale?: string;
    };
    if (!data.sub) throw new UnauthorizedException('Invalid LINE token payload');
    return {
      sub: data.sub,
      name: data.name ?? 'LINE User',
      locale: data.locale,
    };
  }
}

function parseExpiresMs(expiresIn: string): number {
  const m = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const u = m[2];
  const mult =
    u === 's' ? 1000 : u === 'm' ? 60_000 : u === 'h' ? 3_600_000 : 86_400_000;
  return n * mult;
}
