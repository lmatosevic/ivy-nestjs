import * as fs from 'fs';
import { constants, promises as fsp } from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { FileDto, FileError, FileProps } from '../storage';
import { FileMetadata } from '../storage/file-meta';
import { ValidationError } from '../resource';
import { DateUtil } from './date.util';
import { StringUtil } from './string.util';
import * as _ from 'lodash';

export class FilesUtil {
  static generateFileName(originalName: string): string {
    const nameParts = originalName.split('.');
    const uuid = StringUtil.uuidV4();
    if (nameParts.length > 1) {
      return `${nameParts.slice(0, -1).join('.')}_${uuid}.${nameParts.slice(-1)[0]}`;
    } else {
      return `${originalName}_${uuid}`;
    }
  }

  static originalNameFromGenerated(generatedName: string): string {
    const nameParts = generatedName.split('.');
    if (nameParts.length > 1) {
      const extension = nameParts.pop();
      return `${nameParts.join('.').split('_').slice(0, -1).join('_')}.${extension}`;
    } else {
      return generatedName.split('_').slice(0, -1).join('_');
    }
  }

  static makeDirectoryName(pattern: string, meta?: FileMetadata): string {
    return this.replacePatternVariables(pattern, meta);
  }

  static makeFileName(pattern: string, name: string, extension: string, meta?: FileMetadata): string {
    const fileName = this.replacePatternVariables(pattern, meta, { name, extension });
    return fileName.endsWith('.') ? fileName.substring(0, fileName.length - 1) : fileName;
  }

  static async removeTemporaryFiles(files: Record<string, Express.Multer.File[]>): Promise<void> {
    for (let fileObjects of Object.values(files || {})) {
      if (!Array.isArray(fileObjects)) {
        fileObjects = [fileObjects];
      }
      for (const file of fileObjects) {
        try {
          await fsp.unlink(file.path);
        } catch (e) {
          // file already moved or deleted
        }
      }
    }
  }

  static async removeEmptyDirectories(directory: string, level: number = 0) {
    const fileStats = await fsp.lstat(directory);

    if (!fileStats.isDirectory()) {
      return;
    }

    let fileNames = await fsp.readdir(directory);

    if (fileNames.length > 0) {
      const recursiveRemovalPromises = fileNames.map((fileName) =>
        this.removeEmptyDirectories(path.join(directory, fileName), level + 1)
      );
      await Promise.all(recursiveRemovalPromises);
      fileNames = await fsp.readdir(directory);
    }

    if (fileNames.length === 0 && level > 0) {
      await fsp.rmdir(directory);
    }
  }

  static async ensureDirectoryExists(filePath: string): Promise<{ created: boolean; dirname: string }> {
    const fileDirname = path.dirname(filePath);
    try {
      await fsp.access(fileDirname, constants.F_OK);
      return { created: false, dirname: fileDirname };
    } catch (e) {
      await fsp.mkdir(fileDirname, { recursive: true });
      return { created: true, dirname: fileDirname };
    }
  }

  static validateFile(field: string, file: Express.Multer.File | FileDto, fileProps: FileProps): ValidationError[] {
    if (!file) {
      return [{ value: null, property: field, constraints: { required: 'File is required' } }];
    }

    if (file['originalName'] && file['originalName'].includes('/')) {
      return [
        {
          value: null,
          property: field,
          constraints: { originalName: 'File name contains invalid character: /' }
        }
      ];
    }

    let mimetype: string = file['mimetype'];
    let size: number = file['size'];
    if (!mimetype || !size) {
      if (file['data'] && typeof file['data'] !== 'string') {
        return [
          {
            value: file['data'],
            property: field,
            constraints: {
              data: `Invalid file data format; expected: string, received: ${typeof file['data']}`
            }
          }
        ];
      }
      const matches = file['data']?.matchAll(/^data:(.+);base64,(.+)/g);
      const match = matches && matches.next();
      if (!match || !match.value || match.value.length < 2) {
        return []; // File is already persisted (not base64 format)
      }
      mimetype = match.value[1];
      size = match.value[2].length;
    }

    const errors = [];

    if (fileProps.mimeType) {
      let match;
      if (fileProps.mimeType instanceof RegExp) {
        match = mimetype.match(fileProps.mimeType);
      } else {
        match = mimetype.match((fileProps.mimeType as string).replace(/[.+?^$]/g, '\\$&').replace(/\*/g, '.*'));
      }

      if (!match) {
        errors.push({
          value: mimetype,
          property: field,
          constraints: { mimeType: `Required mime-type value: ${fileProps.mimeType}` }
        });
      }
    }

    if (fileProps.maxSize) {
      const maxSizeBytes =
        typeof fileProps.maxSize === 'number' ? fileProps.maxSize : StringUtil.fileSizeStringToBytes(fileProps.maxSize);
      if (maxSizeBytes < size) {
        errors.push({
          value: size,
          property: field,
          constraints: { maxSize: `Maximum allowed file size in bytes: ${maxSizeBytes}` }
        });
      }
    }

    return errors;
  }

  static createFilesUpdateDto(files: Record<string, Express.Multer.File[]>, filePropsMap: Record<string, FileProps>) {
    if (!files) {
      throw new FileError('Empty file contents provided', 400);
    }
    const errors = [];
    const filesUpdateDto = {};
    for (let [fieldName, fileObjects] of Object.entries(files)) {
      const fileProps = filePropsMap[fieldName];
      if (!fileProps) {
        throw new FileError('Invalid file name provided', 400);
      }
      if (!Array.isArray(fileObjects)) {
        fileObjects = [fileObjects];
      }
      for (const file of fileObjects) {
        errors.push(...this.validateFile(fieldName, file, fileProps));
        const fileData = {
          data: file.filename,
          originalName: file.originalname,
          description: `${file.mimetype}_${file.size}`
        };
        if (fileProps.isArray) {
          if (!filesUpdateDto[fieldName] && !Array.isArray(filesUpdateDto[fieldName])) {
            filesUpdateDto[fieldName] = [];
          }
          filesUpdateDto[fieldName].push(fileData);
        } else {
          filesUpdateDto[fieldName] = fileData;
        }
      }
    }

    if (errors.length > 0) {
      throw new FileError('Files content validation failed', 400, errors);
    }

    return filesUpdateDto;
  }

  static createFilesResponseDto<T>(
    files: Record<string, Express.Multer.File[]>,
    data: any
  ): Record<string, string | string[]> {
    const filesResponseDto = {};
    for (const [fieldName, file] of Object.entries(files)) {
      const fileData = data[fieldName];
      if (Array.isArray(fileData) && Array.isArray(file)) {
        filesResponseDto[fieldName] = _.orderBy(fileData, (f) => f.meta?.createdAt, ['asc']).splice(-1 * file.length);
      } else {
        filesResponseDto[fieldName] = fileData;
      }
    }
    return filesResponseDto;
  }

  static mergeFileArrays(currentResource: any, resource: any, fileFields: string[]): void {
    for (const fileField of fileFields) {
      const fileValue = currentResource[fileField];
      if (Array.isArray(fileValue) && fileValue.length > 0) {
        resource[fileField] = [...fileValue, ...resource[fileField]];
      }
    }
  }

  static fileBuffer(filePath: string): Buffer {
    if (!fs.existsSync(filePath)) {
      return Buffer.from('');
    }
    return fs.readFileSync(filePath);
  }

  static parseEnvFile(envFilePath: string): Record<string, any> {
    const fb = this.fileBuffer(envFilePath);
    return dotenv.parse(fb);
  }

  static parseEnvFiles(envFilePaths: string[]): Record<string, any> {
    let config = {};
    for (const envFilePath of envFilePaths) {
      const env = this.parseEnvFile(envFilePath);
      config = _.defaults(config, env);
    }
    return config;
  }

  private static replacePatternVariables(
    pattern: string,
    meta?: FileMetadata,
    extraVariables: Record<string, any> = {}
  ): string {
    const now = new Date();
    const variables = {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth(),
      day: now.getUTCDate(),
      weekDay: now.getUTCDay(),
      yearWeek: DateUtil.getUTCWeekNumber(now),
      yearDay: DateUtil.getUTCDayNumber(now),
      hours: now.getUTCHours(),
      minutes: now.getUTCMinutes(),
      seconds: now.getUTCSeconds(),
      milliseconds: now.getUTCMilliseconds(),
      timestamp: now.getTime(),
      uuid: StringUtil.uuidV4(),
      hash: StringUtil.generateToken('bytes', 32),
      fieldName: StringUtil.camelToSnakeCase(meta?.field),
      resourceName: StringUtil.camelToSnakeCase(meta?.resource)
    };

    let name = pattern;
    for (const [key, value] of Object.entries({ ...variables, ...extraVariables })) {
      const regex = new RegExp(`\{\{${key}}}`, 'g');
      name = name.replace(regex, `${value}`);
    }

    return name;
  }
}
