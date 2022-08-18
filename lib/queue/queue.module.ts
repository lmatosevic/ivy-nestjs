import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule, BullModuleOptions } from '@nestjs/bull';
import { BullModuleAsyncOptions } from '@nestjs/bull/dist/interfaces/bull-module-options.interface';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { QueueService } from './queue.service';
import { QUEUE_MODULE_OPTIONS } from './queue.constant';

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
              host: conf.get('queue.host'),
              port: conf.get('queue.port'),
              db: conf.get('queue.db'),
              username: conf.get('queue.user'),
              password: conf.get('queue.password'),
              ...(queueModuleOptions.redis || {})
            }
          })
        })
      ],
      providers: [...providers, QueueService],
      exports: [QUEUE_MODULE_OPTIONS, BullModule, QueueService]
    };
  }
}
