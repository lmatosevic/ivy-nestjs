import { Inject, Injectable, Logger, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fromBuffer } from 'file-type';
import { FilesUtil } from '../utils';
import { File } from './schema';
import { FileError } from './errors';
import { StorageService } from './services';
import { StorageModuleOptions } from './storage.module';
import { FileProps } from './decorators';
import { FileMetadata, FileMetaService } from './file-meta';
import { AuthUser } from '../auth';
import { FILE_META_SERVICE, STORAGE_MODULE_OPTIONS, STORAGE_SERVICE } from './storage.constants';

export type AccessMeta = {
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

  constructor(
    @Inject(STORAGE_MODULE_OPTIONS) private storageModuleOptions: StorageModuleOptions,
    @Inject(FILE_META_SERVICE) private fileMetaService: FileMetaService,
    @Inject(STORAGE_SERVICE) private storageService: StorageService,
    private configService: ConfigService
  ) {
    if (!this.storageService) {
      throw Error('Storage service implementation is not provided');
    }
    this.dirname = storageModuleOptions.filesDirname || configService.get('storage.filesDirname') || 'files';
    this.tempDirname = storageModuleOptions.tempDirname || configService.get('storage.tempDirname') || 'temp';
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
    const fileName = FilesUtil.generateFileName(name);
    const res = await this.storageService.store(fileName, data, this.dirname);

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
    return await this.storageService.load(name, this.dirname);
  }

  async streamFile(name: string): Promise<StreamableFile | null> {
    if (!(await this.storageService.exists(name, this.dirname))) {
      return null;
    }

    const stream = await this.storageService.stream(name, this.dirname);
    return stream ? new StreamableFile(stream) : null;
  }

  async deleteFile(name: string): Promise<boolean> {
    const result = await this.storageService.delete(name, this.dirname);

    if (result) {
      this.logger.verbose('Deleted file "%s"', name);
      await this.fileMetaService.delete(name);
    }

    return result;
  }

  async moveFromTemp(name: string, meta?: FileMetadata): Promise<StoredFile | null> {
    const result = await this.storageService.move(name, this.tempDirname, this.dirname);
    let metaId;

    if (result) {
      this.logger.verbose('Moved file "%s"', name);
      metaId = await this.fileMetaService.save({ name, ...meta });
    }

    return result ? { fileName: name, metaId } : null;
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

  async persistFile(file: File, isUpdate = false, meta?: FileMetadata): Promise<StoredFile | null> {
    if (!file) {
      return null;
    }

    if (!file.data) {
      throw new FileError('File data is missing', 400);
    }

    const matches = file.data.matchAll(/^data:(.+)\/(.+);base64,(.+)/g);
    const match = matches.next();

    // Data is existing file name
    if (!match || !match.value || match.value.length < 3) {
      let fileUUID;
      try {
        fileUUID = file.data.split('.').slice(0, -1).join('').split('_').slice(-1)[0];
      } catch (e) {
        // invalid file format
      }
      if (isUpdate || FilesUtil.isFileNameSuffixValid(fileUUID)) {
        return null;
      } else {
        throw new FileError('Invalid file format', 400);
      }
    }

    const fileBase64 = match.value[3];
    const fileData = Buffer.from(fileBase64, 'base64');
    const fileType = await fromBuffer(fileData);
    const fileExtension = fileType ? fileType.ext : match.value[2];
    const fileName = file.originalName ?? `file.${fileExtension}`;

    const storedFile = await this.storeFile(fileName, fileData, {
      ...meta,
      mimeType: `${match.value[1]}/${match.value[2]}`,
      size: FilesUtil.fileSizeInBytesFromBase64Length(fileData.length)
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
                  value.description = null;
                  value.meta = movedFile.metaId;
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
                newValue.description = null;
                newValue.meta = movedFile.metaId;
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
}
