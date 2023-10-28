import { ExecutionContext, Inject, Injectable, Optional, Type } from '@nestjs/common';
import { CacheInterceptor as NestjsCacheInterceptor } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as hash from 'object-hash';
import { RESOURCE_REF_KEY } from '../resource';
import { CacheService } from './cache.service';
import { CacheUtil, ContextUtil } from '../utils';
import { CACHED_MODEL_NAME, CACHED_RELATIONS } from './decorators';

@Injectable()
export class CacheInterceptor extends NestjsCacheInterceptor {
  protected allowedMethods = ['GET', 'POST'];

  constructor(
    @Optional() @Inject(CacheService) private cacheService: CacheService,
    protected reflector: Reflector,
    private configService: ConfigService
  ) {
    super(cacheService, reflector);
  }

  trackBy(context: ExecutionContext): string | undefined {
    if (!this.cacheService?.isEnabled()) {
      return;
    }

    const ctx = ContextUtil.normalizeContext(context);
    const req = ctx.switchToHttp().getRequest();

    let key = super.trackBy(ctx);

    // Create hash from post request body as a way to detect changes with requests with different body
    if (req.method === 'POST' && req.body) {
      const bodyHash = hash(req.body);
      key = `${key}_${bodyHash}`;
    }

    // Create cache key suffix composed of all related resources names to enable on-change expiration
    const cachedModelName = this.cachedModelName(ctx);
    const cachedRelations = this.cachedRelations(ctx);
    const resourceName = this.resourceName(ctx);
    key = CacheUtil.createResourceCacheKey(key, cachedModelName, cachedRelations, resourceName);

    // Set authorized user id as cache key prefix
    const request = ctx.switchToHttp().getRequest();
    const { user } = request;
    const userId = user?.getId();

    return `${userId ? userId : ''}_${key}`;
  }

  private cachedModelName(context: ExecutionContext): string {
    return this.reflector.getAllAndOverride<string>(CACHED_MODEL_NAME, [context.getHandler(), context.getClass()]);
  }

  private cachedRelations(context: ExecutionContext): string[] {
    const relations = this.reflector.getAllAndOverride<string[]>(CACHED_RELATIONS, [
      context.getHandler(),
      context.getClass()
    ]);
    return relations || [];
  }

  private resourceName(context: ExecutionContext): string {
    const resourceRef = this.reflector.get<Type<unknown>>(RESOURCE_REF_KEY, context.getClass());
    return resourceRef?.name || null;
  }
}
