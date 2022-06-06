import { DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { MongoExceptionFilter } from './mongo-exception.filter';
import { ResourceExceptionFilter } from './resource-exception.filter';
import { FileExceptionFilter } from './file-exception.filter';
import { AuthorizationExceptionFilter } from './authorization-exception.filter';
import { FILTERS_MODULE_OPTIONS } from './filters.constants';

export interface FiltersModuleOptions {
  debug: boolean;
}

@Module({})
export class FiltersModule {
  static forRoot(options: FiltersModuleOptions): DynamicModule {
    return this.createModule([
      {
        provide: FILTERS_MODULE_OPTIONS,
        useValue: options
      }
    ]);
  }

  static forRootAsync(options: ModuleAsyncOptions<FiltersModuleOptions>): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, FILTERS_MODULE_OPTIONS);
    return this.createModule(providers, imports);
  }

  static createModule(providers: any[] = [], imports: any[] = []): DynamicModule {
    return {
      module: FiltersModule,
      imports: [...imports],
      providers: [
        ...providers,
        {
          provide: APP_FILTER,
          useClass: MongoExceptionFilter
        },
        {
          provide: APP_FILTER,
          useClass: ResourceExceptionFilter
        },
        {
          provide: APP_FILTER,
          useClass: FileExceptionFilter
        },
        {
          provide: APP_FILTER,
          useClass: AuthorizationExceptionFilter
        }
      ],
      exports: [FILTERS_MODULE_OPTIONS]
    };
  }
}
