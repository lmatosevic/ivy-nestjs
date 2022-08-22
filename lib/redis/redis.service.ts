import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { RedisModuleOptions } from './redis.module';
import { REDIS_MODULE_OPTIONS } from './redis.constants';

@Injectable()
export class RedisService {
  private readonly connection: Redis.Redis;

  constructor(
    @Inject(REDIS_MODULE_OPTIONS) private redisModuleOptions: RedisModuleOptions,
    private configService: ConfigService
  ) {
    this.connection = this.createConnection();
  }

  async getValue(key: string): Promise<string> {
    return this.connection.get(key);
  }

  async putValue(key: string, value: any, expireMs?: number): Promise<boolean> {
    const result = expireMs
      ? await this.connection.set(key, value, 'PX', expireMs)
      : await this.connection.set(key, value);
    return result === 'OK';
  }

  async deleteEntry(key: string): Promise<boolean> {
    const result = await this.connection.del(key);
    return result > 0;
  }

  getConnection(): Redis.Redis {
    return this.connection;
  }

  async checkConnection(): Promise<{ status: boolean; message?: string }> {
    return new Promise((resolve) => {
      const testConn = this.createConnection({
        enableReadyCheck: true,
        connectTimeout: 3000,
        retryStrategy() {
          return null;
        }
      });

      testConn.once('ready', () => {
        resolve({ status: true });
        testConn.disconnect();
      });

      testConn.once('error', (e) => {
        resolve({ status: false, message: e.message });
      });
    });
  }

  private createConnection(extraOptions: RedisOptions = {}): Redis.Redis {
    const host = this.redisModuleOptions?.host ?? this.configService.get('redis.host');
    const port = this.redisModuleOptions?.port ?? this.configService.get('redis.port');
    const username = this.redisModuleOptions?.username ?? this.configService.get('redis.user');
    const password = this.redisModuleOptions?.password ?? this.configService.get('redis.password');
    const db = this.redisModuleOptions?.db ?? this.configService.get('redis.db');
    const keyPrefix = this.redisModuleOptions?.keyPrefix ?? this.configService.get('redis.keyPrefix');

    return new Redis({
      port,
      host,
      username,
      password,
      db,
      keyPrefix,
      ...extraOptions
    });
  }
}
