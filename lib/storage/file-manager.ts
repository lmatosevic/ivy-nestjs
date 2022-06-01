import { Inject, Injectable, Logger, StreamableFile } from '@nestjs/common';
import { fromBuffer } from 'file-type';
import { FilesUtil } from '../utils';
import { File } from './schema';
import { FileError } from './errors';
import { FilesystemStorageService } from './services';
import { StorageModuleOptions } from './storage.module';
import { FileProps } from './decorators';
import { MongoFileMetaService, FileMetadata } from './file-meta';
import { AuthUser } from '../auth';
import { STORAGE_MODULE_OPTIONS } from './storage.constants';

export type AccessMeta = {
  allowed: boolean;
  meta: FileMetadata;
};

type StoredFile = {
  fileName: string;
  metaId?: string;
};

@Injectable()
export class FileManager {
  private readonly logger = new Logger(FileManager.name);
  private readonly dirname: string;
  private readonly tempDirname: string;

  constructor(
    @Inject(STORAGE_MODULE_OPTIONS) private storageModuleOptions: StorageModuleOptions,
    private storageService: FilesystemStorageService,
    private fileMetaService: MongoFileMetaService
  ) {
    this.dirname = storageModuleOptions.filesDirname || 'files';
    this.tempDirname = storageModuleOptions.tempDirname || 'temp';
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
      let resource = await this.fileMetaService.filesResource(meta);
      return { allowed: user.getId().equals(resource?.createdBy), meta };
    }

    if (props.access === 'protected' && user && props.policy && props.policy instanceof Function) {
      let resource = await this.fileMetaService.filesResource(meta);
      return { allowed: props.policy(user, meta, resource), meta };
    }

    return { allowed: false, meta };
  }

  async storeFile(name: string, data: Buffer, meta?: FileMetadata): Promise<StoredFile | null> {
    const fileName = FilesUtil.generateFileName(name);
    let res = await this.storageService.store(fileName, data, this.dirname);
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
    let result = await this.storageService.delete(name, this.dirname);
    if (result) {
      this.logger.verbose('Deleted file "%s"', name);
      await this.fileMetaService.delete(name);
    }
    return result;
  }

  async moveFromTemp(name: string, meta?: FileMetadata): Promise<StoredFile | null> {
    let result = await this.storageService.move(name, this.tempDirname, this.dirname);
    let metaId;
    if (result) {
      this.logger.verbose('Moved file "%s"', name);
      metaId = await this.fileMetaService.save({ name, ...meta });
    }
    return result ? { fileName: name, metaId } : null;
  }

  async deleteFileArray(fileFields: string[]): Promise<number> {
    if (!fileFields) {
      return 0;
    }

    let deleteCount = 0;
    for (const fileField of fileFields) {
      if (!!(await this.deleteFile(fileField))) {
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
    let deleteCount = 0;

    for (const fileField of Object.keys(fileProps)) {
      if (!this.fileMetaService.modelFields(currentModel).includes(fileField)) {
        continue;
      }

      let currentValue = currentModel[fileField];

      // Delete all files
      if (!newModel) {
        if (Array.isArray(currentValue)) {
          for (const value of currentValue) {
            if (!!(await this.deleteFile(value.data))) {
              deleteCount++;
            }
          }
        } else if (currentValue && currentValue.data) {
          if (!!(await this.deleteFile(currentValue.data))) {
            deleteCount++;
          }
        }
        continue;
      }

      let newValue = newModel[fileField];

      // Delete only files that are not present in new data model
      if (Array.isArray(currentValue) && Array.isArray(newValue)) {
        for (const value of currentValue) {
          if (newValue.find((nv) => nv.data === value.data)) {
            continue;
          }
          if (!!(await this.deleteFile(value.data))) {
            deleteCount++;
          }
        }
      } else if (currentValue && currentValue.data) {
        if (!newValue || newValue.data !== currentValue.data) {
          if (!!(await this.deleteFile(currentValue.data))) {
            deleteCount++;
          }
        }
      }
    }

    return deleteCount;
  }

  async persistFile(file: File, isUpdate: boolean = false, meta?: FileMetadata): Promise<StoredFile | null> {
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
      let fileUuid;
      try {
        fileUuid = file.data.split('.').slice(0, -1).join('').split('_').slice(-1)[0];
      } catch (e) {
        // invalid file format
      }
      if (isUpdate || FilesUtil.isFileNameSuffixValid(fileUuid)) {
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
    let storedFiles: string[] = [];
    let errors = [];
    try {
      for (const [fileField, props] of Object.entries(fileProps)) {
        if (!this.fileMetaService.modelFields(newModel).includes(fileField)) {
          continue;
        }

        let metadata = {
          resource: this.fileMetaService.modelName(newModel),
          field: fileField,
          resourceId: newModel.id
        };

        let newValue = newModel[fileField];
        let currentValue = currentModel?.[fileField];
        let isUpdate = !!currentModel;

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
            let storedFile = await this.persistFile(value, isUpdate, metadata);
            if (storedFile !== null) {
              value.data = storedFile.fileName;
              value.meta = storedFile.metaId;
              storedFiles.push(storedFile.fileName);
            } else {
              if (isFileUpload) {
                let metaParts = value.description?.split('_');
                let movedFile = await this.moveFromTemp(value.data, {
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
                let existingFile = currentValue.find((cv) => cv.data === value.data);
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
          let storedFile = await this.persistFile(newValue, isUpdate, metadata);
          if (storedFile !== null) {
            newValue.data = storedFile.fileName;
            newValue.meta = storedFile.metaId;
            storedFiles.push(storedFile.fileName);
          } else {
            if (isFileUpload) {
              let metaParts = newValue.description?.split('_');
              let movedFile = await this.moveFromTemp(newValue.data, {
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
