import { ReadStream } from 'fs';

export interface StorageAdapter {
  store(fileName: string, data: Buffer, dirname?: string): Promise<boolean>;

  load(fileName: string, dirname?: string): Promise<Buffer | null>;

  stream(fileName: string, dirname?: string): Promise<ReadStream>;

  delete(fileName: string, dirname?: string): Promise<boolean>;

  exists(fileName: string, dirname?: string): Promise<boolean>;

  move(fileName: string, fromDir: string, toDir: string): Promise<boolean>;
}
