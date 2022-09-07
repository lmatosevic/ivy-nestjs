import { applyDecorators, CacheKey, CacheTTL, SetMetadata, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '../cache.interceptor';

export const IS_CACHED = 'isCached';
export const CACHED_RELATIONS = 'cachedRelations';
export const CACHED_MODEL_NAME = 'cachedModelName';

export interface CacheConfig {
  ttl?: number;
  key?: string;
  relations?: string[];
  modelName?: string;
}

export function Cached(config: CacheConfig = {}) {
  const decorators = [];

  if (typeof config.ttl === 'number') {
    decorators.push(CacheTTL(config.ttl));
  }

  if (config.key) {
    decorators.push(CacheKey(config.key));
  }

  if (config.relations && config.relations.length > 0) {
    decorators.push(SetMetadata(CACHED_RELATIONS, config.relations));
  }

  if (config.modelName) {
    decorators.push(SetMetadata(CACHED_MODEL_NAME, config.modelName));
  }

  return applyDecorators(UseInterceptors(CacheInterceptor), SetMetadata(IS_CACHED, true), ...decorators);
}
