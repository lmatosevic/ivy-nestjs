import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { FilesUtil, ModuleAsyncOptions, ModuleUtil } from '../utils';
import { diskStorage } from 'multer';
import { FilesystemAdapter, StorageAdapter } from './adapters';
import { FileMeta, FileMetaSchema } from './schema';
import { File, FileMeta as FileMetaEntity } from './entity';
import { StorageController } from './storage.controller';
import { FileManager } from './file-manager';
import { MongooseFileMetaService, TypeOrmFileMetaService } from './file-meta';
import { FILE_META_SERVICE, STORAGE_ADAPTER, STORAGE_MODULE_OPTIONS } from './storage.constants';

export interface StorageModuleOptions {
  type?: 'filesystem' | 'custom';
  rootDir?: string;
  filesDirname?: string;
  tempDirname?: string;
  filesRoute?: string;
  filesAccess?: 'all' | 'public' | 'protected' | 'none';
  filesDirPattern?: string;
  filesNamePattern?: string;
  cacheDuration?: number;
  storageAdapter?: StorageAdapter;
}

@Global()
@Module({})
export class StorageModule {
  static forRoot(options: StorageModuleOptions = {}): DynamicModule {
    return this.createModule([
      {
        provide: STORAGE_MODULE_OPTIONS,
        useValue: options
      }
    ]);
  }

  static forRootAsync(options: ModuleAsyncOptions<StorageModuleOptions>): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, STORAGE_MODULE_OPTIONS);
    return this.createModule(providers, [...imports]);
  }

  static createModule(providers: any[] = [], imports: any[] = []): DynamicModule {
    const env = ModuleUtil.getCurrentEnv();
    const dbType = env.DB_TYPE || 'mongoose';

    const { databaseModule, serviceProvider } = this.databaseModuleAndServiceProviders(dbType);

    return {
      module: StorageModule,
      imports: [
        ...imports,
        MulterModule.registerAsync({
          inject: [STORAGE_MODULE_OPTIONS, ConfigService],
          useFactory: async (storageModuleOptions: StorageModuleOptions, conf: ConfigService) => ({
            storage: diskStorage({
              destination: `${storageModuleOptions.rootDir ?? conf.get('storage.rootDir') ?? './storage'}/${
                storageModuleOptions.tempDirname ?? conf.get('storage.tempDirname') ?? 'temp'
              }`,
              filename: (
                req: any,
                file: Express.Multer.File,
                callback: (error: Error | null, filename: string) => void
              ) => {
                callback(null, FilesUtil.generateFileName(file.originalname));
              }
            })
          })
        }),
        databaseModule
      ],
      providers: [...providers, FileManager, serviceProvider, this.storageAdapterProvider()],
      controllers: [StorageController],
      exports: [STORAGE_MODULE_OPTIONS, STORAGE_ADAPTER, MulterModule, FileManager]
    };
  }

  private static databaseModuleAndServiceProviders(dbType: string): {
    databaseModule: DynamicModule;
    serviceProvider: Provider;
  } {
    let databaseModule;
    let databaseFileMetaService;

    if (dbType === 'mongoose') {
      databaseModule = MongooseModule.forFeature([
        {
          name: FileMeta.name,
          schema: FileMetaSchema,
          collection: '_files'
        }
      ]);
      databaseFileMetaService = MongooseFileMetaService;
    } else {
      databaseModule = TypeOrmModule.forFeature([File, FileMetaEntity]);
      databaseFileMetaService = TypeOrmFileMetaService;
    }

    return {
      databaseModule,
      serviceProvider: {
        provide: FILE_META_SERVICE,
        useClass: databaseFileMetaService
      }
    };
  }

  private static storageAdapterProvider(): Provider {
    return {
      provide: STORAGE_ADAPTER,
      inject: [STORAGE_MODULE_OPTIONS, ConfigService],
      useFactory: async (options: StorageModuleOptions, config: ConfigService) => {
        const storageType = options.type ?? config.get('storage.type');
        switch (storageType) {
          case 'filesystem':
            return new FilesystemAdapter(options, config);
          default:
            return options.storageAdapter;
        }
      }
    };
  }
}
