import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { FilesUtil, ModuleAsyncOptions, ModuleUtil } from '../utils';
import { diskStorage } from 'multer';
import { FilesystemStorageService } from './services';
import { FileMeta, FileMetaSchema } from './schema';
import { File, FileMeta as FileMetaEntity } from './entity';
import { StorageController } from './storage.controller';
import { FileManager } from './file-manager';
import { MongoFileMetaService, TypeOrmFileMetaService } from './file-meta';
import { FILE_META_SERVICE, STORAGE_MODULE_OPTIONS, STORAGE_SERVICE } from './storage.constants';

export interface StorageModuleOptions {
  type?: 'filesystem' | 'custom';
  rootDir?: string;
  filesDirname?: string;
  tempDirname?: string;
  filesRoute?: string;
  filesAccess?: 'all' | 'public' | 'protected' | 'none';
  cacheDuration?: number;
  customData?: any;
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

    const { databaseModule, metaServiceProvider } = this.databaseModuleAndMetaServiceProviders(dbType);

    return {
      module: StorageModule,
      imports: [
        ...imports,
        MulterModule.registerAsync({
          inject: [STORAGE_MODULE_OPTIONS, ConfigService],
          useFactory: async (storageModuleOptions: StorageModuleOptions, conf: ConfigService) => ({
            storage: diskStorage({
              destination: `${storageModuleOptions.rootDir || conf.get('storage.rootDir') || './storage'}/${
                storageModuleOptions.tempDirname || conf.get('storage.tempDirname') || 'temp'
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
      providers: [...providers, FileManager, metaServiceProvider, this.storageServiceProvider()],
      controllers: [StorageController],
      exports: [STORAGE_MODULE_OPTIONS, MulterModule, FileManager]
    };
  }

  private static databaseModuleAndMetaServiceProviders(dbType: string): {
    databaseModule: DynamicModule;
    metaServiceProvider: Provider;
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
      databaseFileMetaService = MongoFileMetaService;
    } else {
      databaseModule = TypeOrmModule.forFeature([File, FileMetaEntity]);
      databaseFileMetaService = TypeOrmFileMetaService;
    }

    return {
      databaseModule,
      metaServiceProvider: {
        provide: FILE_META_SERVICE,
        useClass: databaseFileMetaService
      }
    };
  }

  private static storageServiceProvider(): Provider {
    return {
      provide: STORAGE_SERVICE,
      inject: [STORAGE_MODULE_OPTIONS, ConfigService],
      useFactory: async (options: StorageModuleOptions, config: ConfigService) => {
        const storageType = options.type ?? config.get('storage.type');
        switch (storageType) {
          case 'filesystem':
            return new FilesystemStorageService(options, config);
        }
      }
    };
  }
}
