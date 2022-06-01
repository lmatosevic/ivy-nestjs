import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { ContextUtil } from '../../../utils';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../decorators';

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
    if (isPublic) {
      return true;
    }

    const ctx = ContextUtil.normalizeContext(context);

    return super.canActivate(ctx);
  }
}
