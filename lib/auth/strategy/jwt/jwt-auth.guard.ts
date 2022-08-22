import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ContextUtil } from '../../../utils';
import { HAS_AUTH_KEY, IS_PUBLIC_KEY } from '../../decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector, private jwtService: JwtService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    const isAuth = this.reflector.getAllAndOverride<boolean>(HAS_AUTH_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic && !isAuth) {
      return true;
    }

    const ctx = ContextUtil.normalizeContext(context);
    const req = ctx.switchToHttp().getRequest();

    if (req.headers?.['authorization']) {
      const payload = this.jwtService.decode(req.headers['authorization'].split(' ')[1]);
      if (
        ['AuthResolver', 'AuthController'].includes(ctx.getClass().name) &&
        ctx.getHandler().name === 'refresh'
      ) {
        return payload?.['refresh'] === true ? super.canActivate(ctx) : false;
      } else if (payload?.['refresh'] === true) {
        return false;
      }
    }

    return super.canActivate(ctx);
  }
}
