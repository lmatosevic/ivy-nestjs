import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { promises as fsp } from 'fs';
import { FileDto, FileError, FileProps } from '../storage';
import { ValidationError } from '../resource';
import { StringUtil } from './string.util';

export class FilesUtil {
  static generateFileName(originalName: string): string {
    const nameParts = originalName.split('.');
    const uuid = uuidv4();
    if (nameParts.length > 1) {
      return `${nameParts.slice(0, -1).join('')}_${uuid}.${nameParts.slice(-1)}`;
    } else {
      return `${originalName}_${uuid}`;
    }
  }

  static isFileNameSuffixValid(suffix: string): boolean {
    return uuidValidate(suffix);
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

  static fileSizeInBytesFromBase64Length(length: number): number {
    return Math.round(3 * (length / 4));
  }

  static validateFile(
    field: string,
    file: Express.Multer.File | FileDto,
    fileProps: FileProps
  ): ValidationError[] {
    if (!file) {
      return [{ value: null, property: field, constraints: { required: 'File is required' } }];
    }

    let mimetype: string = file['mimetype'];
    let size: number = file['size'];
    if (!mimetype || !size) {
      const matches = file['data']?.matchAll(/^data:(.+);base64,(.+)/g);
      const match = matches && matches.next();
      if (!match || !match.value || match.value.length < 2) {
        return []; // File is already persisted (not base64 format)
      }
      mimetype = match.value[1];
      size = match.value[2].length;
    }

    let errors = [];

    if (fileProps.mimeType) {
      let match;
      if (fileProps instanceof RegExp) {
        match = mimetype.match(fileProps.mimeType);
      } else {
        match = mimetype.match((fileProps.mimeType as string).replace('*', '.*'));
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
      let maxSizeBytes =
        typeof fileProps.maxSize === 'number'
          ? fileProps.maxSize
          : StringUtil.fileSizeStringToBytes(fileProps.maxSize);
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

  static createFilesUpdateDto(
    files: Record<string, Express.Multer.File[]>,
    filePropsMap: Record<string, FileProps>
  ) {
    if (!files) {
      throw new FileError('Empty file contents provided', 400);
    }
    let errors = [];
    let filesUpdateDto = {};
    for (let [fieldName, fileObjects] of Object.entries(files)) {
      let fileProps = filePropsMap[fieldName];
      if (!fileProps) {
        throw new FileError('Invalid file name provided', 400);
      }
      if (!Array.isArray(fileObjects)) {
        fileObjects = [fileObjects];
      }
      for (const file of fileObjects) {
        errors.push(...this.validateFile(fieldName, file, fileProps));
        let fileData = {
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

  static createFilesResponseDto(files: Record<string, Express.Multer.File[]>, data: any) {
    let filesResponseDto = {};
    for (const [fieldName, file] of Object.entries(files)) {
      const fileData = data[fieldName];
      if (Array.isArray(fileData) && Array.isArray(file)) {
        filesResponseDto[fieldName] = fileData.splice(-1 * file.length);
      } else {
        filesResponseDto[fieldName] = fileData;
      }
    }
    return filesResponseDto;
  }
}
