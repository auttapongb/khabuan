import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY, AuthUser } from '../decorators/auth.decorators';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      cookies?: Record<string, string>;
      user?: AuthUser;
    }>();

    const cookieName =
      this.config.get<string>('SESSION_COOKIE_NAME') ?? 'mcg_session';
    const raw =
      req.cookies?.[cookieName] ??
      extractBearer(req.headers['authorization']);

    if (!raw) throw new UnauthorizedException('Missing session');

    try {
      const payload = this.jwt.verify<{
        sub: string;
        displayName: string;
        isAdmin?: boolean;
      }>(raw);
      req.user = {
        userId: payload.sub,
        displayName: payload.displayName,
        isAdmin: !!payload.isAdmin,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid session');
    }
  }
}

function extractBearer(header?: string): string | undefined {
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice(7);
}
