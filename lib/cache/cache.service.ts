import { CACHE_MANAGER, Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import * as glob from 'glob';
import { promises as fsp } from 'fs';
import { Action } from '../enums';
import { FilesUtil } from '../utils';
import { CacheChangeStrategy, CacheEvictionStrategy, CacheModuleOptions, CacheType } from './cache.module';
import { CACHE_MODULE_OPTIONS } from './cache.constants';

type KeyMeta = {
  key: string;
  usedCount: number;
  createdAt: number;
  lastUsedAt: number;
  expiresAt?: number;
};

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly storeType: CacheType;
  private readonly cachePrefix: string;
  private readonly ttl: number;
  private readonly maxItems: number;
  private readonly evictionStrategy: CacheEvictionStrategy;
  private readonly evictionDeferred: boolean;
  private readonly changeStrategy: CacheChangeStrategy;
  private readonly changeDeferred: boolean;
  private readonly filesystemRootDir: string;
  private readonly metadataPath: string;
  private readonly cleanStart: boolean;
  private readonly enabled: boolean;

  private keysMeta: Record<string, KeyMeta> = {};

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(CACHE_MODULE_OPTIONS) private cacheModuleOptions: CacheModuleOptions,
    private configService: ConfigService
  ) {
    this.storeType = cacheModuleOptions.type ?? configService.get('cache.type') ?? 'memory';
    this.cachePrefix = cacheModuleOptions.prefix ?? configService.get('cache.prefix') ?? '';
    this.maxItems = cacheModuleOptions.maxItems ?? configService.get('cache.maxItems') ?? 100;
    this.ttl = cacheModuleOptions.ttl ?? configService.get('cache.ttl') ?? 5;
    this.evictionStrategy =
      cacheModuleOptions.evictionStrategy ?? configService.get('cache.evictionStrategy');
    this.evictionDeferred =
      cacheModuleOptions.evictionDeferred ?? configService.get('cache.evictionDeferred');
    this.changeStrategy = cacheModuleOptions.changeStrategy ?? configService.get('cache.changeStrategy');
    this.changeDeferred = cacheModuleOptions.changeDeferred ?? configService.get('cache.changeDeferred');
    this.filesystemRootDir =
      cacheModuleOptions?.filesystem?.rootDir ?? configService.get('cache.filesystem.rootDir');
    this.metadataPath = `${this.filesystemRootDir}/metadata.json`;
    this.cleanStart = cacheModuleOptions.cleanStart ?? configService.get('cache.cleanStart') ?? true;
    this.enabled = cacheModuleOptions.enabled ?? configService.get('cache.enabled') ?? true;
    if (!this.enabled) {
      this.logger.warn('Caching is disabled');
    }
  }

  async onModuleInit(): Promise<void> {
    if (this.cleanStart) {
      await this.expire();
      this.logger.verbose('Cache cleaned');
    } else {
      await this.loadKeysMeta();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.cleanStart) {
      await this.storeKeysMeta();
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
      const data = await this.cacheManager.get<T>(this.prefixedKey(key));
      if (data) {
        const now = Date.now();
        const count = this.keysMeta[key]?.usedCount ?? 0;
        this.keysMeta[key] = {
          ...(this.keysMeta[key] || { key, createdAt: now }),
          usedCount: count + 1,
          lastUsedAt: now
        };
      }
      return data;
    }
  }

  async set(key: string, value: any, ttl?: number | any): Promise<void> {
    if (this.enabled) {
      await this.cacheManager.set(this.prefixedKey(key), value, ttl);
      const now = Date.now();
      const expiresAt =
        ttl === 0
          ? undefined
          : ttl
          ? now + (typeof ttl === 'object' ? ttl.ttl : ttl) * 1000
          : now + this.ttl * 1000;
      this.keysMeta[key] = {
        key,
        usedCount: 1,
        createdAt: now,
        lastUsedAt: now,
        expiresAt
      };
      await this.evict();
    }
  }

  async del(key: string): Promise<void> {
    if (this.enabled) {
      await this.cacheManager.del(this.prefixedKey(key));
      delete this.keysMeta[key];
    }
  }

  async loadKeysMeta(): Promise<void> {
    try {
      const data = await fsp.readFile(this.metadataPath);
      this.keysMeta = JSON.parse(data.toString());
      await this.evict();
      this.logger.verbose('Cache keys metadata loaded');
    } catch (e) {
      this.logger.warn('Unable to read cache metadata from file: %s', this.metadataPath);
    }
  }

  async storeKeysMeta(): Promise<void> {
    const { created, dirname } = await FilesUtil.ensureDirectoryExists(this.metadataPath);
    if (created) {
      this.logger.verbose('Created cache directory: %s', dirname);
    }
    try {
      await fsp.writeFile(this.metadataPath, JSON.stringify(this.keysMeta, null, 2));
      this.logger.verbose('Cache keys metadata saved');
    } catch (e) {
      this.logger.warn('Unable to write cache metadata to file: %s', this.metadataPath);
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

  async evict(): Promise<void> {
    if (this.evictionDeferred) {
      this.evictExcessEntries().finally();
    } else {
      await this.evictExcessEntries();
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

  private async evictExcessEntries(): Promise<void> {
    const expiredKeys = [];

    for (const meta of Object.values(this.keysMeta)) {
      if (meta.expiresAt && meta.expiresAt < Date.now()) {
        expiredKeys.push(meta.key);
      }
    }

    for (const expiredKey of expiredKeys) {
      delete this.keysMeta[expiredKey];
    }

    const removeCount = Object.keys(this.keysMeta).length - this.maxItems;
    if (removeCount <= 0) {
      return;
    }

    let sortedKeys;
    switch (this.evictionStrategy) {
      case 'LRU':
        sortedKeys = this.sortLRU();
        break;
      case 'LFU':
        sortedKeys = this.sortLFU();
        break;
      case 'FIFO':
        sortedKeys = this.sortFIFO();
        break;
      default:
        sortedKeys = this.sortFIFO();
    }

    const deleteActions = [];
    for (let i = 0; i < removeCount; i++) {
      const key = sortedKeys[i];
      if (key) {
        deleteActions.push(this.del(key));
      }
    }

    await Promise.all(deleteActions);

    this.logger.verbose('Evicted %d entries from cache', deleteActions.length);
  }

  private sortLRU(): string[] {
    return Object.values(this.keysMeta)
      .sort((first: KeyMeta, second: KeyMeta) => (first.lastUsedAt ?? 0) - (second.lastUsedAt ?? 0))
      .map((meta) => meta.key);
  }

  private sortLFU(): string[] {
    const now = Date.now();
    return Object.values(this.keysMeta)
      .sort(
        (first: KeyMeta, second: KeyMeta) =>
          first.usedCount / (now - first.createdAt) - second.usedCount / (now - second.createdAt)
      )
      .map((meta) => meta.key);
  }

  private sortFIFO(): string[] {
    return Object.values(this.keysMeta)
      .sort((first: KeyMeta, second: KeyMeta) => first.createdAt - second.createdAt)
      .map((meta) => meta.key);
  }
}
