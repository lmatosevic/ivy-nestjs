import { DynamicModule, Global, Module } from '@nestjs/common';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { RedisService } from './redis.service';
import { REDIS_MODULE_OPTIONS } from './redis.constants';
import { RedisOptions } from 'ioredis';

export type RedisModuleOptions = RedisOptions;

@Global()
@Module({})
export class RedisModule {
  static forRoot(options: RedisModuleOptions = {}): DynamicModule {
    return this.createModule([
      {
        provide: REDIS_MODULE_OPTIONS,
        useValue: options
      }
    ]);
  }

  static forRootAsync(options: ModuleAsyncOptions<RedisModuleOptions>): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, REDIS_MODULE_OPTIONS);
    return this.createModule(providers, imports);
  }

  static createModule(providers: any[] = [], imports: any[] = []): DynamicModule {
    return {
      module: RedisModule,
      imports: [...imports],
      providers: [...providers, RedisService],
      exports: [REDIS_MODULE_OPTIONS, RedisService]
    };
  }
}
