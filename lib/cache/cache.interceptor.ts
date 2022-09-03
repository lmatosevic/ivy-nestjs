import {
  CacheInterceptor as NestjsCacheInterceptor,
  ExecutionContext,
  Inject,
  Injectable,
  Optional
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as hash from 'object-hash';
import { CacheService } from './cache.service';
import { ContextUtil } from '../utils';
import { CACHE_SERVICE } from './cache.constants';

@Injectable()
export class CacheInterceptor extends NestjsCacheInterceptor {
  protected allowedMethods = ['GET', 'POST'];

  constructor(
    @Optional() @Inject(CACHE_SERVICE) private cacheService: CacheService,
    protected reflector: Reflector
  ) {
    super(cacheService?.getCacheManager(), reflector);
  }

  trackBy(context: ExecutionContext): string | undefined {
    if (!this.cacheService?.isEnabled()) {
      return;
    }

    const ctx = ContextUtil.normalizeContext(context);
    const req = ctx.switchToHttp().getRequest();

    let key = super.trackBy(ctx);

    if (req.method === 'POST' && req.body) {
      const bodyHash = hash(req.body);
      key = `${key}_${bodyHash}`;
    }

    const request = ctx.switchToHttp().getRequest();
    const { user } = request;
    const userId = user?.getId();

    return this.cacheService.prefixedKey(`${userId ? userId : ''}_${key}`);
  }
}
