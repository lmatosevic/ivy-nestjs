import { Inject, Injectable, Logger, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { constants, promises as fsp } from 'fs';
import * as path from 'path';
import { StorageAdapter } from './storage.adapter';
import { FilesUtil } from '../../utils';
import { StorageModuleOptions } from '../storage.module';
import { STORAGE_MODULE_OPTIONS } from '../storage.constants';

@Injectable()
export class FilesystemAdapter implements StorageAdapter {
  private readonly logger = new Logger(FilesystemAdapter.name);
  private readonly rootDir: string;

  constructor(
    @Inject(STORAGE_MODULE_OPTIONS) private storageModuleOptions: StorageModuleOptions,
    private configService: ConfigService
  ) {
    this.rootDir = storageModuleOptions.rootDir || configService.get('storage.rootDir') || './storage';
    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir, { recursive: true });
      this.logger.log('Created root directory: %s', path.resolve(this.rootDir));
    }

    this.logger.verbose('Storage root directory: %s', path.resolve(this.rootDir));
  }

  async store(fileName: string, data: Buffer, filesDir?: string): Promise<boolean> {
    const filePath = await this.getFilePath(fileName, filesDir, true);
    try {
      await fsp.writeFile(filePath, data);
      return true;
    } catch (e) {
      this.logger.error('Error storing file "%s", %j', filePath, e);
      return false;
    }
  }

  async load(fileName: string, filesDir?: string): Promise<Buffer | null> {
    const filePath = await this.getFilePath(fileName, filesDir);
    try {
      return await fsp.readFile(filePath);
    } catch (e) {
      this.logger.error('Error loading file "%s", %j', filePath, e);
      return null;
    }
  }

  async stream(fileName: string, filesDir?: string, start?: number, end?: number): Promise<StreamableFile | null> {
    const filePath = await this.getFilePath(fileName, filesDir);
    try {
      const stats = await fsp.stat(filePath);
      const endIndex = start >= 0 && !end && end !== 0 ? stats.size - 1 : Math.min(end, stats.size - 1);
      const readStream = fs.createReadStream(filePath, {
        start,
        end: !Number.isNaN(endIndex) ? endIndex : undefined
      });
      return new StreamableFile(readStream, { length: stats.size });
    } catch (e) {
      this.logger.error('Error streaming file "%s", %j', filePath, e);
      return null;
    }
  }

  async delete(fileName: string, filesDir?: string): Promise<boolean> {
    const filePath = await this.getFilePath(fileName, filesDir);
    try {
      await fsp.unlink(filePath);
      await FilesUtil.removeEmptyDirectories(`${this.rootDir}/${filesDir ?? ''}`);
      return true;
    } catch (e) {
      this.logger.error('Error deleting file "%s", %j', filePath, e);
      return false;
    }
  }

  async exists(fileName: string, filesDir?: string): Promise<boolean> {
    const filePath = await this.getFilePath(fileName, filesDir);
    try {
      await fsp.access(filePath, constants.F_OK);
      return true;
    } catch (e) {
      return false;
    }
  }

  async move(sourceFile: string, destFile: string): Promise<boolean> {
    const fromFilePath = await this.getFilePath(sourceFile);
    const toFilePath = await this.getFilePath(destFile, '', true);
    try {
      if (!(await this.exists(sourceFile))) {
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

  private async getFilePath(fileName: string, dirname?: string, mkdir: boolean = false): Promise<string> {
    const filePath = `${this.rootDir}/${dirname ? dirname + '/' : ''}${fileName}`;
    if (mkdir) {
      const { created, dirname } = await FilesUtil.ensureDirectoryExists(filePath);
      if (created) {
        this.logger.verbose('Created files directory: %s', path.resolve(dirname));
      }
    }
    return filePath;
  }
}
