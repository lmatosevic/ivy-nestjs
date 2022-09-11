import { Inject, Injectable, Logger, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fromBuffer } from 'file-type';
import { FilesUtil, ObjectUtil } from '../utils';
import { FileDto } from './dto';
import { FileError } from './errors';
import { StorageAdapter } from './adapters';
import { StorageModuleOptions } from './storage.module';
import { FileProps } from './decorators';
import { FileMetadata, FileMetaService } from './file-meta';
import { AuthUser } from '../auth';
import { FILE_META_SERVICE, STORAGE_ADAPTER, STORAGE_MODULE_OPTIONS } from './storage.constants';

type AccessMeta = {
  allowed: boolean;
  meta: FileMetadata;
};

type StoredFile = {
  fileName: string;
  metaId?: string | number;
};

@Injectable()
export class FileManager {
  private readonly logger = new Logger(FileManager.name);
  private readonly dirname: string;
  private readonly tempDirname: string;
  private readonly filesDirPattern: string;
  private readonly filesNamePattern: string;

  constructor(
    @Inject(STORAGE_MODULE_OPTIONS) private storageModuleOptions: StorageModuleOptions,
    @Inject(FILE_META_SERVICE) private fileMetaService: FileMetaService,
    @Inject(STORAGE_ADAPTER) private storageAdapter: StorageAdapter,
    private configService: ConfigService
  ) {
    if (!this.storageAdapter) {
      throw Error('Storage adapter implementation is not provided');
    }
    this.dirname = storageModuleOptions.filesDirname || configService.get('storage.filesDirname') || 'files';
    this.tempDirname = storageModuleOptions.tempDirname || configService.get('storage.tempDirname') || 'temp';
    this.filesDirPattern =
      storageModuleOptions.filesDirPattern ?? configService.get('storage.filesDirPattern');
    this.filesNamePattern =
      storageModuleOptions.filesNamePattern ?? configService.get('storage.filesNamePattern');
  }

  useWith(sessionManager: any): FileManager {
    const managedService = ObjectUtil.duplicate<FileManager>(this);

    managedService.setFileMetaService(this.fileMetaService.useWith(sessionManager) || this.fileMetaService);

    return managedService;
  }

  async checkFileAccess(name: string, user: AuthUser): Promise<AccessMeta> {
    const { props, meta } = await this.fileMetaService.filePropsMeta(name);
    if (!props) {
      return { allowed: false, meta };
    }

    if (!props.access || props.access === 'public') {
      return { allowed: true, meta };
    }

    if (props.access === 'protected' && !props.policy) {
      return { allowed: !!user, meta };
    }

    if (props.access === 'private' && meta && user) {
      const resource = await this.fileMetaService.filesResource(meta);
      return { allowed: user.getId().equals(resource?.createdBy), meta };
    }

    if (props.access === 'protected' && user && props.policy && props.policy instanceof Function) {
      const resource = await this.fileMetaService.filesResource(meta);
      return { allowed: props.policy(user, meta, resource), meta };
    }

    return { allowed: false, meta };
  }

  async storeFile(name: string, data: Buffer, meta?: FileMetadata): Promise<StoredFile | null> {
    const directory = await this.directoryName(name, meta);
    const file = await this.fileName(name, meta);
    const fileName = `${directory}${file}`;

    const res = await this.storageAdapter.store(fileName, data, this.dirname);
    if (res) {
      this.logger.verbose('Stored file "%s"', fileName);
    }

    let metaId;
    if (res && meta) {
      metaId = await this.fileMetaService.save({ name: fileName, ...meta });
    }

    return res ? { fileName, metaId } : null;
  }

  async loadFile(name: string): Promise<Buffer | null> {
    return await this.storageAdapter.load(name, this.dirname);
  }

  async streamFile(name: string, start?: number, end?: number): Promise<StreamableFile | null> {
    if (!(await this.storageAdapter.exists(name, this.dirname))) {
      return null;
    }

    const stream = await this.storageAdapter.stream(name, this.dirname, start, end);
    return stream ? new StreamableFile(stream) : null;
  }

  async deleteFile(name: string): Promise<boolean> {
    const result = await this.storageAdapter.delete(name, this.dirname);

    if (result) {
      this.logger.verbose('Deleted file "%s"', name);
      await this.fileMetaService.delete(name);
    }

    return result;
  }

  async moveFromTemp(name: string, meta?: FileMetadata): Promise<StoredFile | null> {
    const originalName = FilesUtil.originalNameFromGenerated(name.split('/').pop());
    const directory = await this.directoryName(originalName, meta);
    const file = await this.fileName(originalName, meta);
    const fileName = `${directory}${file}`;

    const fromFile = `${this.tempDirname.endsWith('/') ? this.tempDirname : this.tempDirname + '/'}${name}`;
    const toFile = `${this.dirname.endsWith('/') ? this.dirname : this.dirname + '/'}${fileName}`;

    const result = await this.storageAdapter.move(fromFile, toFile);
    let metaId;

    if (result) {
      this.logger.verbose('Moved file "%s"', fileName);
      metaId = await this.fileMetaService.save({ name: fileName, ...meta });
    }

    return result ? { fileName, metaId } : null;
  }

  async updateFilesMetaResourceIds(fileNames: string[], id: string | number): Promise<boolean> {
    let success = true;

    if (!fileNames || fileNames.length === 0) {
      return success;
    }

    for (const fileName of fileNames) {
      const result = await this.fileMetaService.update(fileName, { resourceId: id });
      if (!result) {
        success = false;
      }
    }

    return success;
  }

  async deleteFileArray(fileNames: string[]): Promise<number> {
    if (!fileNames) {
      return 0;
    }

    let deleteCount = 0;
    for (const fileName of fileNames) {
      if (!!(await this.deleteFile(fileName))) {
        deleteCount++;
      }
    }

    return deleteCount;
  }

  async deleteFiles(
    fileProps: Record<string, FileProps>,
    currentModel: any,
    newModel?: any
  ): Promise<number> {
    const filesToDelete = this.getFilesToDelete(fileProps, currentModel, newModel);
    return this.deleteFileArray(filesToDelete);
  }

  getFilesToDelete(fileProps: Record<string, FileProps>, currentModel: any, newModel?: any): string[] {
    const fileNames: string[] = [];

    for (const fileField of Object.keys(fileProps)) {
      if (!this.fileMetaService.modelFields(currentModel).includes(fileField)) {
        continue;
      }

      const currentValue = currentModel[fileField];

      // Delete all files
      if (!newModel) {
        if (Array.isArray(currentValue)) {
          for (const value of currentValue) {
            fileNames.push(value.data);
          }
        } else if (currentValue && currentValue.data) {
          fileNames.push(currentValue.data);
        }
        continue;
      }

      const newValue = newModel[fileField];

      // Delete only files that are not present in new data model
      if (Array.isArray(currentValue) && Array.isArray(newValue)) {
        for (const value of currentValue) {
          if (newValue.find((nv) => nv.data === value.data)) {
            continue;
          }
          fileNames.push(value.data);
        }
      } else if (currentValue && currentValue.data) {
        if (!newValue || newValue.data !== currentValue.data) {
          fileNames.push(currentValue.data);
        }
      }
    }

    return fileNames;
  }

  async persistFile(file: FileDto, isUpdate = false, meta?: FileMetadata): Promise<StoredFile | null> {
    if (!file) {
      return null;
    }

    if (!file.data) {
      throw new FileError('File data is missing', 400);
    }

    const matches = file.data.matchAll(/^data:(.+)\/(.+);base64,(.+)/g);
    const match = matches.next();

    // Data is an existing file name
    if (!match || !match.value || match.value.length < 3) {
      if (isUpdate) {
        return null;
      } else {
        throw new FileError('Invalid file format', 400);
      }
    }

    const fileBase64 = match.value[3];
    const fileData = Buffer.from(fileBase64, 'base64');
    const fileType = await fromBuffer(fileData);
    const fileExtension = fileType ? fileType.ext : match.value[2];
    const fileName = file.originalName ?? `${meta?.field || 'file'}.${fileExtension}`;

    const storedFile = await this.storeFile(fileName, fileData, {
      ...meta,
      mimeType: `${match.value[1]}/${match.value[2]}`,
      size: fileData.length
    });

    if (storedFile === null) {
      throw new FileError('Cannot persist file', 500);
    }

    return storedFile;
  }

  async persistFiles(
    fileProps: Record<string, FileProps>,
    newModel: any,
    currentModel?: any,
    isFileUpload?: boolean
  ): Promise<string[]> {
    const storedFiles: string[] = [];
    const errors = [];
    try {
      for (const [fileField, props] of Object.entries(fileProps)) {
        if (!this.fileMetaService.modelFields(newModel).includes(fileField)) {
          continue;
        }

        const metadata = {
          resource: this.fileMetaService.modelName(newModel),
          field: fileField,
          resourceId: newModel.id
        };

        const newValue = newModel[fileField];
        const currentValue = currentModel?.[fileField];
        const isUpdate = !!currentModel;

        if (Array.isArray(newValue)) {
          if (props.maxCount > 0 && newValue.length > props.maxCount) {
            errors.push({
              value: newValue.length,
              property: fileField,
              constraints: {
                maxCount: `Maximum number of allowed files for this property: ${props.maxCount}`
              }
            });
          }
          for (const value of newValue) {
            errors.push(...FilesUtil.validateFile(fileField, value, props));
            if (errors.length > 0) {
              continue;
            }
            const storedFile = await this.persistFile(value, isUpdate, metadata);
            if (storedFile !== null) {
              value.data = storedFile.fileName;
              value.meta = storedFile.metaId;
              storedFiles.push(storedFile.fileName);
            } else {
              if (isFileUpload) {
                const metaParts = value.description?.split('_');
                const movedFile = await this.moveFromTemp(value.data, {
                  ...metadata,
                  mimeType: metaParts?.[0],
                  size: parseInt(metaParts?.[1])
                });
                if (movedFile) {
                  value.data = movedFile.fileName;
                  value.meta = movedFile.metaId;
                  value.description = null;
                  storedFiles.push(movedFile.fileName);
                }
              } else if (isUpdate && Array.isArray(currentValue)) {
                const existingFile = currentValue.find((cv) => cv.data === value.data);
                if (!existingFile) {
                  errors.push({
                    value: value.data,
                    property: fileField,
                    constraints: {
                      invalidName: 'Only file names from this resource and field property can be used'
                    }
                  });
                } else {
                  value.meta = existingFile.meta;
                }
              }
            }
          }
        } else if (newValue) {
          errors.push(...FilesUtil.validateFile(fileField, newValue, props));
          if (errors.length > 0) {
            continue;
          }
          const storedFile = await this.persistFile(newValue, isUpdate, metadata);
          if (storedFile !== null) {
            newValue.data = storedFile.fileName;
            newValue.meta = storedFile.metaId;
            storedFiles.push(storedFile.fileName);
          } else {
            if (isFileUpload) {
              const metaParts = newValue.description?.split('_');
              const movedFile = await this.moveFromTemp(newValue.data, {
                ...metadata,
                mimeType: metaParts?.[0],
                size: parseInt(metaParts?.[1])
              });
              if (movedFile) {
                newValue.data = movedFile.fileName;
                newValue.meta = movedFile.metaId;
                newValue.description = null;
                storedFiles.push(movedFile.fileName);
              }
            } else if (isUpdate && newValue) {
              newValue.data = currentValue?.data;
              newValue.meta = currentValue?.meta;
            }
          }
        }
      }
      if (errors.length > 0) {
        throw new FileError('Files validation error', 400, errors);
      }
    } catch (e) {
      // Remove all recently stored files if error occurs
      for (const storedFile of storedFiles) {
        await this.deleteFile(storedFile);
      }
      throw e;
    }

    return storedFiles;
  }

  private async directoryName(name: string, meta?: FileMetadata): Promise<string> {
    let dirPattern = this.filesDirPattern;

    if (meta) {
      const fileProps = await this.fileMetaService.fileProps(meta);
      if (fileProps?.dirname) {
        if (typeof fileProps.dirname === 'function') {
          dirPattern = fileProps.dirname(name, meta);
        } else {
          dirPattern = fileProps.dirname;
        }
      }
    }

    let dirName;
    if (dirPattern) {
      dirName = FilesUtil.makeDirectoryName(dirPattern, meta);
    }

    if (!dirName) {
      return '';
    }

    if (dirName.startsWith('/') && dirName.length > 1) {
      dirName = dirName.substring(1);
    }

    return dirName.endsWith('/') ? dirName : dirName + '/';
  }

  private async fileName(name: string, meta?: FileMetadata): Promise<string> {
    let filePattern = this.filesNamePattern;

    if (meta) {
      const fileProps = await this.fileMetaService.fileProps(meta);
      if (fileProps?.filename) {
        if (typeof fileProps.filename === 'function') {
          filePattern = fileProps.filename(name, meta);
        } else {
          filePattern = fileProps.filename;
        }
      }
    }

    let fileName;
    if (filePattern) {
      const nameParts = name.split('.');
      let extension = '';
      let originalName = name;
      if (nameParts.length > 1) {
        extension = nameParts.pop();
        originalName = nameParts.join('.');
      }
      fileName = FilesUtil.makeFileName(filePattern, originalName, extension, meta);
    }

    return fileName || name;
  }

  private setFileMetaService(service: FileMetaService): void {
    this.fileMetaService = service;
  }
}
