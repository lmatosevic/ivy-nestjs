import { StreamableFile } from '@nestjs/common';

export interface StorageAdapter {
  store(fileName: string, data: Buffer, filesDir?: string): Promise<boolean>;

  load(fileName: string, filesDir?: string): Promise<Buffer | null>;

  stream(fileName: string, filesDir?: string, start?: number, end?: number): Promise<StreamableFile>;

  delete(fileName: string, filesDir?: string): Promise<boolean>;

  exists(fileName: string, filesDir?: string): Promise<boolean>;

  move(sourceFile: string, destFile: string): Promise<boolean>;
}
