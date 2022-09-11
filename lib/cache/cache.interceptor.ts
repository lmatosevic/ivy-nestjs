import {
  CacheInterceptor as NestjsCacheInterceptor,
  ExecutionContext,
  Inject,
  Injectable,
  Optional,
  Type
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as hash from 'object-hash';
import { MongoResourceService, RESOURCE_REF_KEY, TypeOrmResourceService } from '../resource';
import { CacheService } from './cache.service';
import { ContextUtil } from '../utils';
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
    const cachedRelations = this.cachedRelations(ctx);
    const cachedModelName = this.cachedModelName(ctx);
    const name = this.resourceName(ctx);
    if ((cachedRelations.length === 1 && cachedRelations[0] === '*') || cachedModelName) {
      const allRelations = this.resourceRelationNames(cachedModelName);
      key = `${key}_!${allRelations.join('!')}!`;
    } else if (cachedRelations.length > 0) {
      key = `${key}_!${cachedRelations.join('!')}!`;
    } else if (name) {
      const relations = this.resourceRelationNames(name);
      if (!relations.includes(name)) {
        relations.push(name);
      }
      key = `${key}_!${relations.join('!')}!`;
    }

    // Set authorized user id as cache key prefix
    const request = ctx.switchToHttp().getRequest();
    const { user } = request;
    const userId = user?.getId();

    return `${userId ? userId : ''}_${key}`;
  }

  private cachedRelations(context: ExecutionContext): string[] {
    const relations = this.reflector.getAllAndOverride<string[]>(CACHED_RELATIONS, [
      context.getHandler(),
      context.getClass()
    ]);
    return relations || [];
  }

  private cachedModelName(context: ExecutionContext): string {
    return this.reflector.getAllAndOverride<string>(CACHED_MODEL_NAME, [
      context.getHandler(),
      context.getClass()
    ]);
  }

  private resourceName(context: ExecutionContext): string {
    const resourceRef = this.reflector.get<Type<unknown>>(RESOURCE_REF_KEY, context.getClass());
    return resourceRef?.name || null;
  }

  private resourceRelationNames(resourceName?: string): string[] {
    const dbType = this.configService.get('db.type');
    const modelRelationNames =
      dbType === 'mongoose'
        ? MongoResourceService.modelRelationNames
        : TypeOrmResourceService.modelRelationNames;

    if (!resourceName) {
      return Object.keys(modelRelationNames || {});
    }

    return modelRelationNames?.[resourceName] || [];
  }
}
