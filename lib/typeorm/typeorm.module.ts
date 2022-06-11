import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule as NestjsTypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { DEFAULT_DATA_SOURCE_NAME } from '@nestjs/typeorm/dist/typeorm.constants';
import { TYPEORM_MODULE_OPTIONS } from './typeorm.constant';

@Global()
@Module({})
export class TypeOrmModule {
  static forRoot(options: TypeOrmModuleOptions = {}): DynamicModule {
    return this.createModule([
      {
        provide: TYPEORM_MODULE_OPTIONS,
        useValue: options
      }
    ]);
  }

  static forRootAsync(options: ModuleAsyncOptions<TypeOrmModuleOptions>): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, TYPEORM_MODULE_OPTIONS);
    return this.createModule(providers, imports);
  }

  static forFeature(
    entities: EntityClassOrSchema[] = [],
    dataSource: DataSource | DataSourceOptions | string = DEFAULT_DATA_SOURCE_NAME
  ): DynamicModule {
    return NestjsTypeOrmModule.forFeature(entities, dataSource);
  }

  static createModule(providers: any[] = [], imports: any[] = []): DynamicModule {
    return {
      module: TypeOrmModule,
      imports: [
        ...imports,
        NestjsTypeOrmModule.forRootAsync({
          inject: [TYPEORM_MODULE_OPTIONS, ConfigService],
          useFactory: async (typeOrmModuleOptions: TypeOrmModuleOptions, conf: ConfigService) => ({
            type: conf.get<any>('db.type'),
            host: conf.get<string>('db.host'),
            port: conf.get<number>('db.port'),
            username: conf.get<string>('db.user'),
            password: conf.get<string>('db.password'),
            database: conf.get<string>('db.name'),
            schema: conf.get<string>('db.schema'),
            autoLoadEntities: true,
            synchronize:
              !conf.get<string>('db.migration.enabled') && conf.get<string>('env') !== 'production',
            ...(typeOrmModuleOptions as any)
          })
        })
      ],
      providers: [...providers],
      exports: [TYPEORM_MODULE_OPTIONS, NestjsTypeOrmModule]
    };
  }
}
