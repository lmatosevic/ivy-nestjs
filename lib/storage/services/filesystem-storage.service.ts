import * as fs from 'fs';
import { constants, promises as fsp, ReadStream } from 'fs';
import * as path from 'path';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageModuleOptions } from '../storage.module';
import { STORAGE_MODULE_OPTIONS } from '../storage.constants';

@Injectable()
export class FilesystemStorageService implements StorageService {
  private readonly logger = new Logger(FilesystemStorageService.name);
  private readonly rootDir: string;

  constructor(
    @Inject(STORAGE_MODULE_OPTIONS) private storageModuleOptions: StorageModuleOptions,
    private configService: ConfigService
  ) {
    this.rootDir = storageModuleOptions.rootDir || configService.get('storage.rootDir') || './storage';
    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir, { recursive: true });
      this.logger.log('Created directory: %s', path.resolve(this.rootDir));
    }

    this.logger.verbose('Storage root directory: %s', path.resolve(this.rootDir));
  }

  async store(fileName: string, data: Buffer, dirname?: string): Promise<boolean> {
    const filePath = this.filePath(fileName, dirname);
    try {
      await fsp.writeFile(filePath, data);
    } catch (e) {
      this.logger.error('Error storing file "%s", %j', filePath, e);
      return false;
    }
    return true;
  }

  async load(fileName: string, dirname?: string): Promise<Buffer | null> {
    const filePath = this.filePath(fileName, dirname);
    try {
      return await fsp.readFile(filePath);
    } catch (e) {
      this.logger.error('Error loading file "%s", %j', filePath, e);
      return null;
    }
  }

  async stream(fileName: string, dirname?: string): Promise<ReadStream | null> {
    const filePath = this.filePath(fileName, dirname);
    try {
      return fs.createReadStream(filePath);
    } catch (e) {
      this.logger.error('Error streaming file "%s", %j', filePath, e);
      return null;
    }
  }

  async delete(fileName: string, dirname?: string): Promise<boolean> {
    const filePath = this.filePath(fileName, dirname);
    try {
      await fsp.unlink(filePath);
    } catch (e) {
      this.logger.error('Error deleting file "%s", %j', filePath, e);
      return false;
    }
    return true;
  }

  async exists(fileName: string, dirname?: string): Promise<boolean> {
    const filePath = this.filePath(fileName, dirname);
    try {
      await fsp.access(filePath, constants.F_OK);
      return true;
    } catch (e) {
      return false;
    }
  }

  async move(fileName: string, fromDir: string, toDir: string): Promise<boolean> {
    const fromFilePath = this.filePath(fileName, fromDir);
    const toFilePath = this.filePath(fileName, toDir);
    try {
      if (!(await this.exists(fileName, fromDir))) {
        return false;
      }
      await fsp.rename(fromFilePath, toFilePath);
      return true;
    } catch (e) {
      // If moving accross partitions or virtual volumes
      const source = fs.createReadStream(fromFilePath);
      const dest = fs.createWriteStream(toFilePath);
      source.pipe(dest);

      return new Promise((resolve) => {
        source.on('end', () => resolve(true));
        source.on('error', () => resolve(false));
      });
    }
  }

  private filePath(fileName: string, dirname?: string): string {
    const filePath = `${this.rootDir}/${dirname ? dirname + '/' : ''}${fileName}`;
    const fileDirname = path.dirname(filePath);
    if (!fs.existsSync(fileDirname)) {
      fs.mkdirSync(fileDirname, { recursive: true });
      this.logger.log('Created directory: %s', path.resolve(fileDirname));
    }
    return filePath;
  }
}
