import { DynamicModule, Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { FilesUtil, ModuleAsyncOptions, ModuleUtil } from '../utils';
import { diskStorage } from 'multer';
import { FilesystemStorageService } from './services';
import { FileMeta, FileMetaSchema } from './schema';
import { StorageController } from './storage.controller';
import { FileManager } from './file-manager';
import { MongoFileMetaService } from './file-meta';
import { STORAGE_MODULE_OPTIONS } from './storage.constants';

export interface StorageModuleOptions {
  rootDir?: string;
  filesDirname?: string;
  tempDirname?: string;
  filesRoute?: string;
  filesAccess?: 'all' | 'public' | 'protected' | 'none';
  cacheDuration?: number;
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
        MongooseModule.forFeature([{ name: FileMeta.name, schema: FileMetaSchema, collection: '_files' }])
      ],
      providers: [...providers, FileManager, FilesystemStorageService, MongoFileMetaService],
      controllers: [StorageController],
      exports: [STORAGE_MODULE_OPTIONS, MulterModule, FileManager]
    };
  }
}
