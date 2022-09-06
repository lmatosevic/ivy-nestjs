import { CACHE_MANAGER, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import * as glob from 'glob';
import { promises as fsp } from 'fs';
import { Action } from '../enums';
import { FilesUtil } from '../utils';
import { CacheChangeStrategy, CacheModuleOptions, CacheType } from './cache.module';
import { CACHE_MODULE_OPTIONS } from './cache.constants';

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private readonly storeType: CacheType;
  private readonly cachePrefix: string;
  private readonly changeStrategy: CacheChangeStrategy;
  private readonly changeDeferred: boolean;
  private readonly enabled: boolean;

  private static cleanStart: boolean = false;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(CACHE_MODULE_OPTIONS) private cacheModuleOptions: CacheModuleOptions,
    private configService: ConfigService
  ) {
    this.storeType = cacheModuleOptions.type ?? configService.get('cache.type') ?? 'memory';
    this.cachePrefix = cacheModuleOptions.prefix ?? configService.get('cache.prefix') ?? '';
    this.changeStrategy = cacheModuleOptions.changeStrategy ?? configService.get('cache.changeStrategy');
    this.changeDeferred = cacheModuleOptions.changeDeferred ?? configService.get('cache.changeDeferred');
    this.enabled = cacheModuleOptions.enabled ?? configService.get('cache.enabled') ?? true;
    if (!this.enabled) {
      this.logger.warn('Caching is disabled');
    }
  }

  async onModuleInit(): Promise<void> {
    if (
      !CacheService.cleanStart &&
      (this.cacheModuleOptions.cleanStart ?? this.configService.get('cache.cleanStart'))
    ) {
      CacheService.cleanStart = true;
      await this.expire();
      this.logger.verbose('Cache cleaned');
    }
  }

  getCacheManager(): Cache {
    return this.cacheManager;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  prefixedKey(key: string): string {
    const prefix = `${this.cachePrefix ? this.cachePrefix + ':' : ''}_cache:`;
    if (key.startsWith(prefix)) {
      return key;
    }
    return `${prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.enabled) {
      return await this.cacheManager.get<T>(this.prefixedKey(key));
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (this.enabled) {
      await this.cacheManager.set(this.prefixedKey(key), value, ttl ? { ttl } : undefined);
    }
  }

  async del(key: string): Promise<void> {
    if (this.enabled) {
      await this.cacheManager.del(this.prefixedKey(key));
    }
  }

  async expire(pattern: string = '*'): Promise<void> {
    if (this.enabled) {
      const keySet = await this.keys(this.prefixedKey(pattern));
      await Promise.all(Array.from(keySet).map((key) => this.del(key)));
      this.logger.debug('Cache expired with pattern: %s', pattern);
      if (this.storeType === 'filesystem') {
        await this.removeEmptyDirs();
      }
    }
  }

  async expireOnChange(resource: string, action: Action): Promise<void> {
    if (this.enabled && this.changeStrategy !== 'none') {
      this.logger.verbose('Expiring cache on %s %s', resource, action);

      let pattern;
      if (this.changeStrategy === 'expire-all') {
        pattern = '*';
      } else if (this.changeStrategy === 'expire-related') {
        pattern = `*!${resource}!*`;
      }

      if (this.changeDeferred) {
        this.expire(pattern).finally();
      } else {
        await this.expire(pattern);
      }
    }
  }

  async keys(pattern: string = '*'): Promise<Set<string>> {
    if (!this.enabled) {
      return new Set<string>();
    }

    switch (this.storeType) {
      case 'redis':
        return this.redisKeys(pattern);
      case 'filesystem':
        return this.filesystemKeys(pattern);
      case 'memory':
        return this.memoryKeys(pattern);
      default:
        return new Set<string>();
    }
  }

  private async redisKeys(pattern: string): Promise<Set<string>> {
    const redis = this.getCacheManager().store?.['getClient']?.();

    if (!redis) {
      return new Set<string>();
    }

    return new Promise((resolve) => {
      const stream = redis.scanStream({
        match: pattern,
        count: 1000
      });

      const keysSet = new Set<string>();

      stream.on('data', (keys) => {
        stream.pause();
        keys.forEach((key) => keysSet.add(key));
        stream.resume();
      });

      stream.on('end', () => {
        resolve(keysSet);
      });
    });
  }

  private async filesystemKeys(pattern: string): Promise<Set<string>> {
    const options = this.getCacheManager().store['options'];
    const regex = pattern.replace(/[.+?^$]/g, '\\$&').replace(/\*/g, '.*');

    return new Promise((resolve, reject) => {
      const keysSet = new Set<string>();

      glob(`${options.path}/**/*.json`, async (err, files) => {
        if (err) {
          reject(err);
        }

        for (const file of files) {
          try {
            const data = await fsp.readFile(file, 'utf-8');
            const json = JSON.parse(data.toString());
            if (json['key'].match(regex)) {
              keysSet.add(json['key']);
            }
          } catch (e) {
            this.logger.error('Error while reading cache file: %j', e);
          }
        }

        resolve(keysSet);
      });
    });
  }

  private async memoryKeys(pattern: string): Promise<Set<string>> {
    const memoryKeys = await this.getCacheManager().store.keys();
    const regex = pattern.replace(/[.+?^$]/g, '\\$&').replace(/\*/g, '.*');
    return new Set<string>(memoryKeys.filter((mk) => mk.match(regex)));
  }

  private async removeEmptyDirs(): Promise<void> {
    const options = this.getCacheManager().store['options'];
    return FilesUtil.removeEmptyDirectories(options.path + '/');
  }
}
