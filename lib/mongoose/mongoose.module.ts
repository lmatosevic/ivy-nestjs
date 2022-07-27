import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AsyncModelFactory,
  ModelDefinition,
  MongooseModule as NestjsMongooseModule,
  MongooseModuleOptions
} from '@nestjs/mongoose';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { MongooseLoggerService } from './mongoose-logger.service';
import { MONGOOSE_MODULE_OPTIONS } from './mongoose.constant';

@Global()
@Module({})
export class MongooseModule {
  static forRoot(options: MongooseModuleOptions = {}): DynamicModule {
    return this.createModule([
      {
        provide: MONGOOSE_MODULE_OPTIONS,
        useValue: options
      }
    ]);
  }

  static forRootAsync(options: ModuleAsyncOptions<MongooseModuleOptions>): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, MONGOOSE_MODULE_OPTIONS);
    return this.createModule(providers, imports);
  }

  static forFeature(models: ModelDefinition[] = [], connectionName?: string): DynamicModule {
    return NestjsMongooseModule.forFeature(models, connectionName);
  }

  static forFeatureAsync(factories: AsyncModelFactory[] = [], connectionName?: string): DynamicModule {
    return NestjsMongooseModule.forFeatureAsync(factories, connectionName);
  }

  static createModule(providers: any[] = [], imports: any[] = []): DynamicModule {
    return {
      module: MongooseModule,
      imports: [
        ...imports,
        NestjsMongooseModule.forRootAsync({
          inject: [MONGOOSE_MODULE_OPTIONS, ConfigService],
          useFactory: async (mongooseModuleOptions: MongooseModuleOptions, conf: ConfigService) => ({
            uri: `mongodb://${conf.get('db.host')}:${conf.get('db.port')}`,
            authSource: conf.get('db.authSource'),
            replicaSet: conf.get('db.replicaSet'),
            user: conf.get('db.user'),
            pass: conf.get('db.password'),
            dbName: conf.get('db.name'),
            appname: conf.get('app.name'),
            autoCreate: true,
            autoIndex: true,
            ...mongooseModuleOptions
          })
        })
      ],
      providers: [...providers, MongooseLoggerService],
      exports: [MONGOOSE_MODULE_OPTIONS, NestjsMongooseModule]
    };
  }
}
