import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ContextUtil } from '../../../utils';
import { IS_PUBLIC_KEY } from '../../decorators';

@Injectable()
export class ApikeyAuthGuard extends AuthGuard('apikey') {
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
