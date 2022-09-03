import { CACHE_MANAGER, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import * as glob from 'glob';
import { promises as fsp } from 'fs';
import { CacheModuleOptions } from './cache.module';
import { CACHE_MODULE_OPTIONS } from './cache.constants';

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private readonly storeType: string;
  private readonly cachePrefix: string;
  private readonly enabled: boolean;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(CACHE_MODULE_OPTIONS) private cacheModuleOptions: CacheModuleOptions,
    private configService: ConfigService
  ) {
    this.storeType = cacheModuleOptions.type ?? configService.get('cache.type') ?? 'memory';
    this.cachePrefix = cacheModuleOptions.prefix ?? configService.get('cache.prefix') ?? '';
    this.enabled = cacheModuleOptions.enabled ?? configService.get('cache.enabled') ?? true;
    if (!this.enabled) {
      this.logger.warn('Caching is disabled');
    }
  }

  async onModuleInit(): Promise<void> {
    if (this.cacheModuleOptions.cleanStart ?? this.configService.get('cache.cleanStart')) {
      await this.reset();
      this.logger.log('Cache cleaned');
    }
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

  async reset(): Promise<void> {
    if (this.enabled) {
      await this.deleteBy('*');
    }
  }

  getCacheManager(): Cache {
    return this.cacheManager;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  prefixedKey(key: string): string {
    return `${this.cachePrefix ? this.cachePrefix + ':' : ''}_cache:${key}`;
  }

  async deleteBy(pattern: string = '*'): Promise<void> {
    if (this.enabled) {
      const keySet = await this.keys(this.prefixedKey(pattern));
      await Promise.all(Array.from(keySet).map((key) => this.cacheManager.del(key)));
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
}
