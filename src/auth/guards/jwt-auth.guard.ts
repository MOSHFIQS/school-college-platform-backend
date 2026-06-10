import {
  Injectable, ExecutionContext, CanActivate,
  ForbiddenException, UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

// ── JWT Guard ──────────────────────────────────────────────────────────────────
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}

// ── Roles Guard ────────────────────────────────────────────────────────────────
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    if (!required.includes(user.role)) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${required.join(', ')}`,
      );
    }
    return true;
  }
}

// ── MustChangePassword Guard ──────────────────────────────────────────────────
// Blocks all routes except /auth/change-password when mustChangePassword = true
@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) return true; // Let JwtAuthGuard handle unauthenticated

    if (user.mustChangePassword) {
      const url: string = req.url || '';
      // Only allow the change-password endpoint itself
      if (!url.includes('/auth/change-password') && !url.includes('/auth/logout')) {
        throw new ForbiddenException(
          'You must change your password before accessing the portal. ' +
          'Please call POST /api/v1/auth/change-password',
        );
      }
    }
    return true;
  }
}
