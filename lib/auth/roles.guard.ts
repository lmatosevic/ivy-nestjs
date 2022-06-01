import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums';
import { ContextUtil } from '../utils';
import { ROLES_KEY } from './decorators';
import { AuthorizationError } from '../auth/errors';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!requiredRoles) {
      return true;
    }
    const ctx = ContextUtil.normalizeContext(context);
    const { user } = ctx.switchToHttp().getRequest();

    const hasRole = requiredRoles.some((role) => user?.hasRole(role));

    if (!hasRole) {
      throw new AuthorizationError('User does not meet role requirement', 403);
    }
    return true;
  }
}
