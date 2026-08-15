import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthUser } from '../decorators/auth.decorators';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!req.user?.isAdmin) {
      throw new ForbiddenException('Admin only');
    }
    return true;
  }
}
