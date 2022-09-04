import {
  CacheModule as NestjsCacheModule,
  DynamicModule,
  Global,
  MiddlewareConsumer,
  Module,
  NestModule
} from '@nestjs/common';
import { CacheStore, CacheStoreFactory } from '@nestjs/common/cache/interfaces/cache-manager.interface';
import { ConfigService } from '@nestjs/config';
import * as fileStore from 'cache-manager-fs-hash';
import * as redisStore from 'cache-manager-ioredis';
import { RedisOptions } from 'ioredis';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { RedisModule, RedisService } from '../redis';
import { CacheService } from './cache.service';
import { CacheInterceptor } from './cache.interceptor';
import { CacheMiddleware } from './cache.middleware';
import { CACHE_MODULE_OPTIONS, CACHE_SERVICE } from './cache.constants';

export type CacheType = 'redis' | 'filesystem' | 'memory' | 'custom';

export type CacheChangeStrategy = 'expire' | 'expire-defer' | 'none';

export interface CacheModuleOptions {
  type?: CacheType;
  prefix?: string;
  ttl?: number;
  maxItems?: number;
  enabled?: boolean;
  cleanStart?: boolean;
  changeStrategy?: CacheChangeStrategy;
  redis?: RedisOptions;
  filesystem?: { rootDir?: string; subdirsEnabled?: boolean; maxSize?: number };
  store?: string | CacheStoreFactory | CacheStore;
  isCacheableValue?: (value: any) => boolean;
  options?: Record<string, any>;
}

@Global()
@Module({})
export class CacheModule implements NestModule {
  static forRoot(options: CacheModuleOptions = {}): DynamicModule {
    return this.createModule([
      {
        provide: CACHE_MODULE_OPTIONS,
        useValue: options
      }
    ]);
  }

  static forRootAsync(options: ModuleAsyncOptions<CacheModuleOptions>): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, CACHE_MODULE_OPTIONS);
    return this.createModule(providers, imports);
  }

  static createModule(providers: any[] = [], imports: any[] = []): DynamicModule {
    const env = ModuleUtil.getCurrentEnv();
    const cacheType = env.CACHE_TYPE || 'redis';

    return {
      module: CacheModule,
      imports: [...imports, this.configureCacheModule(cacheType)],
      providers: [
        ...providers,
        CacheInterceptor,
        CacheMiddleware,
        CacheService,
        { provide: CACHE_SERVICE, useClass: CacheService }
      ],
      exports: [
        CACHE_MODULE_OPTIONS,
        CACHE_SERVICE,
        NestjsCacheModule,
        CacheInterceptor,
        CacheMiddleware,
        CacheService
      ]
    };
  }

  private static configureCacheModule(cacheType: string): DynamicModule {
    if (cacheType === 'redis') {
      return NestjsCacheModule.registerAsync({
        imports: [
          RedisModule.forRootAsync({
            inject: [ConfigService],
            useFactory: async (conf: ConfigService) => ({
              host: conf.get('redis.host'),
              port: conf.get('redis.port'),
              db: conf.get('redis.db'),
              username: conf.get('redis.user'),
              password: conf.get('redis.password'),
              keyPrefix: conf.get('redis.keyPrefix')
            })
          })
        ],
        inject: [CACHE_MODULE_OPTIONS, ConfigService, RedisService],
        useFactory: async (
          cacheModuleOptions: CacheModuleOptions,
          conf: ConfigService,
          redisService: RedisService
        ) => ({
          store: redisStore,
          ...(cacheModuleOptions.redis || redisService.getConnection().options),
          ttl: cacheModuleOptions.ttl ?? conf.get('cache.ttl'),
          max: cacheModuleOptions.maxItems ?? conf.get('cache.maxItems'),
          isCacheableValue: cacheModuleOptions.isCacheableValue
        })
      });
    }

    if (cacheType === 'filesystem') {
      return NestjsCacheModule.registerAsync({
        inject: [CACHE_MODULE_OPTIONS, ConfigService],
        useFactory: async (cacheModuleOptions: CacheModuleOptions, conf: ConfigService) => ({
          store: fileStore,
          options: {
            ttl: cacheModuleOptions.ttl ?? conf.get('cache.ttl'),
            path: cacheModuleOptions.filesystem?.rootDir ?? conf.get('cache.filesystem.rootDir'),
            subdirs:
              cacheModuleOptions.filesystem?.subdirsEnabled ?? conf.get('cache.filesystem.subdirsEnabled'),
            maxSize: cacheModuleOptions.filesystem?.maxSize ?? conf.get('cache.filesystem.maxSize')
          },
          ttl: cacheModuleOptions.ttl ?? conf.get('cache.ttl'),
          max: cacheModuleOptions.maxItems ?? conf.get('cache.maxItems'),
          isCacheableValue: cacheModuleOptions.isCacheableValue
        })
      });
    }

    return NestjsCacheModule.registerAsync({
      inject: [CACHE_MODULE_OPTIONS, ConfigService],
      useFactory: async (cacheModuleOptions: CacheModuleOptions, conf: ConfigService) => ({
        store: cacheModuleOptions.store || 'memory',
        ttl: cacheModuleOptions.ttl ?? conf.get('cache.ttl'),
        max: cacheModuleOptions.maxItems ?? conf.get('cache.maxItems'),
        isCacheableValue: cacheModuleOptions.isCacheableValue,
        ...(cacheModuleOptions.options || {})
      })
    });
  }

  configure(consumer: MiddlewareConsumer): any {
    consumer.apply(CacheMiddleware).forRoutes('*');
  }
}
