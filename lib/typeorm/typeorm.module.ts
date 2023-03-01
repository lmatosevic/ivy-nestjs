import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { TlsOptions } from 'tls';
import { TypeOrmModule as NestjsTypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DEFAULT_DATA_SOURCE_NAME } from '@nestjs/typeorm/dist/typeorm.constants';
import { DataSource, DataSourceOptions, LoggerOptions } from 'typeorm';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { TypeOrmLogger } from './logger';
import { TypeormMigrationService } from './typeorm-migration.service';
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
            ssl: this.makeSSLProperty(conf.get<boolean>('db.tlsEnabled'), conf.get<string>('db.tlsCAPath')),
            entities: ['./node_modules/ivy-nestjs/**/*.entity.js'],
            subscribers: [`${conf.get('db.migration.distRoot')}/**/*.subscriber{.ts,.js}`],
            migrations: [
              `${conf.get('db.migration.distRoot')}/**/${conf.get('db.migration.dirname')}/**/*{.ts,.js}`
            ],
            migrationsTableName: conf.get<string>('db.migration.table'),
            autoLoadEntities: true,
            logging: conf.get<LoggerOptions>('db.logging'),
            logger: new TypeOrmLogger(conf.get<LoggerOptions>('db.logging')),
            synchronize:
              !conf.get<string>('db.migration.enabled') && conf.get<string>('env') !== 'production',
            ...(typeOrmModuleOptions as any)
          })
        })
      ],
      providers: [...providers, TypeormMigrationService],
      exports: [TYPEORM_MODULE_OPTIONS, NestjsTypeOrmModule]
    };
  }

  private static makeSSLProperty(tlsEnabled: boolean, tlsCAPath?: string): boolean | TlsOptions {
    if (!tlsEnabled) {
      return false;
    }

    if (tlsCAPath) {
      return { ca: fs.readFileSync(tlsCAPath) };
    }

    return true;
  }
}
