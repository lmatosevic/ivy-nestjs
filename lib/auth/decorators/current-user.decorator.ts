import { ContextUtil } from '../../utils';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = ContextUtil.normalizeContext(context);
    return ctx.switchToHttp().getRequest().user;
  }
);
