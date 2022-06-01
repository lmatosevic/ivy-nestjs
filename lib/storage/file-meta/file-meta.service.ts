import { FileProps } from '../../storage';

export type FileMetadata = {
  field: string;
  resource: string;
  resourceId: string;
  name?: string;
  mimeType?: string;
  size?: number;
};

export type FilePropsMeta = {
  props: FileProps;
  meta: FileMetadata;
};

export interface FileMetaService {
  find(name: string): Promise<FileMetadata>;

  save(meta: FileMetadata): Promise<string>;

  delete(name: string): Promise<boolean>;

  filePropsMeta(name: string): Promise<FilePropsMeta>;

  filesResource(meta: FileMetadata): Promise<any>;

  modelName(model: any): string;

  modelFields(model: any): string[];
}
