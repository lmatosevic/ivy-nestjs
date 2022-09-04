import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ContextUtil } from '../../../utils/context.util';
import { HAS_AUTH_KEY } from '../../decorators/authorize.decorator';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';

@Injectable()
export class BasicAuthGuard extends AuthGuard('basic') {
  constructor(private reflector: Reflector) {
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

    return super.canActivate(ctx);
  }
}
