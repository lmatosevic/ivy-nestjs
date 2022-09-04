import { applyDecorators, CacheKey, CacheTTL, SetMetadata, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '../cache.interceptor';

export const IS_CACHED = 'isCached';

export interface CacheConfig {
  ttl?: number;
  key?: string;
}

export function Cached(config: CacheConfig = {}) {
  const decorators = [];

  if (typeof config.ttl === 'number') {
    decorators.push(CacheTTL(config.ttl));
  }

  if (config.key) {
    decorators.push(CacheKey(config.key));
  }

  return applyDecorators(UseInterceptors(CacheInterceptor), SetMetadata(IS_CACHED, true), ...decorators);
}
