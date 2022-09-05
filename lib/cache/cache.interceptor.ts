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
import { CACHE_SERVICE } from './cache.constants';
import { CACHED_RELATIONS } from './decorators';

@Injectable()
export class CacheInterceptor extends NestjsCacheInterceptor {
  protected allowedMethods = ['GET', 'POST'];

  constructor(
    @Optional() @Inject(CACHE_SERVICE) private cacheService: CacheService,
    protected reflector: Reflector,
    private configService: ConfigService
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

    const cachedRelations = this.cachedRelations(ctx);
    const name = this.resourceName(ctx);
    if (name && cachedRelations.length === 0) {
      const relations = [name, ...this.resourceRelationNames(name)].join('!');
      key = `${key}_!${relations}!`;
    } else if (cachedRelations.length > 0) {
      key = `${key}_!${cachedRelations.join('!')}!`;
    }

    const request = ctx.switchToHttp().getRequest();
    const { user } = request;
    const userId = user?.getId();

    return this.cacheService.prefixedKey(`${userId ? userId : ''}_${key}`);
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

  private resourceRelationNames(resourceName: string): string[] {
    const dbType = this.configService.get('db.type');
    if (dbType === 'mongoose') {
      return MongoResourceService.modelRelationNames?.[resourceName] || [];
    } else {
      return TypeOrmResourceService.modelRelationNames?.[resourceName] || [];
    }
  }
}
