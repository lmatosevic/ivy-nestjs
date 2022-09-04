import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ContextUtil } from '../../utils';

export const CacheManager = createParamDecorator((data: unknown, context: ExecutionContext) => {
  const ctx = ContextUtil.normalizeContext(context);
  return ctx.switchToHttp().getRequest().cacheManager;
});
