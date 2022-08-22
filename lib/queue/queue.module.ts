import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule, BullModuleOptions } from '@nestjs/bull';
import { BullModuleAsyncOptions } from '@nestjs/bull/dist/interfaces/bull-module-options.interface';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { QUEUE_MODULE_OPTIONS } from './queue.constant';
import { RedisModule } from '../redis';

export type QueueModuleOptions = BullModuleOptions;

export type QueueModuleAsyncOptions = BullModuleAsyncOptions;

@Global()
@Module({})
export class QueueModule {
  static forRoot(options: QueueModuleOptions = {}): DynamicModule {
    return this.createModule([
      {
        provide: QUEUE_MODULE_OPTIONS,
        useValue: options
      }
    ]);
  }

  static forRootAsync(options: ModuleAsyncOptions<QueueModuleOptions>): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, QUEUE_MODULE_OPTIONS);
    return this.createModule(providers, imports);
  }

  static registerQueue(...options: QueueModuleOptions[]): DynamicModule {
    return BullModule.registerQueue(...options);
  }

  static registerQueueAsync(...options: QueueModuleAsyncOptions[]): DynamicModule {
    return BullModule.registerQueueAsync(...options);
  }

  static createModule(providers: any[] = [], imports: any[] = []): DynamicModule {
    return {
      module: QueueModule,
      imports: [
        ...imports,
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
        }),
        BullModule.forRootAsync({
          inject: [QUEUE_MODULE_OPTIONS, ConfigService],
          useFactory: async (queueModuleOptions: QueueModuleOptions, conf: ConfigService) => ({
            defaultJobOptions: {
              removeOnComplete: conf.get('queue.removeOnComplete'),
              removeOnFail: conf.get('queue.removeOnFail'),
              attempts: conf.get('queue.retryAttempts'),
              backoff: conf.get('queue.retryBackoff'),
              ...(queueModuleOptions.defaultJobOptions || {})
            },
            prefix: conf.get('queue.prefix'),
            ...queueModuleOptions,
            redis: {
              host: conf.get('redis.host'),
              port: conf.get('redis.port'),
              db: conf.get('redis.db'),
              username: conf.get('redis.user'),
              password: conf.get('redis.password'),
              keyPrefix: conf.get('redis.keyPrefix'),
              ...(queueModuleOptions.redis || {})
            }
          })
        })
      ],
      providers: [...providers],
      exports: [QUEUE_MODULE_OPTIONS, BullModule]
    };
  }
}
