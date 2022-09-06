import { ReadStream } from 'fs';

export interface StorageAdapter {
  store(fileName: string, data: Buffer, filesDir?: string): Promise<boolean>;

  load(fileName: string, filesDir?: string): Promise<Buffer | null>;

  stream(fileName: string, filesDir?: string): Promise<ReadStream>;

  delete(fileName: string, filesDir?: string): Promise<boolean>;

  exists(fileName: string, filesDir?: string): Promise<boolean>;

  move(fileName: string, fromDir: string, toDir: string): Promise<boolean>;
}
