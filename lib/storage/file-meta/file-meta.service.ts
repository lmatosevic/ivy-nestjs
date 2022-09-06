import { FileProps } from '../../storage';

export type FileMetadata = {
  field: string;
  resource: string;
  resourceId?: string | number;
  name?: string;
  mimeType?: string;
  size?: number;
};

export type FilePropsMeta = {
  props: FileProps;
  meta: FileMetadata;
};

export interface FileMetaService {
  useWith?(sessionManager: any): FileMetaService;

  find(name: string): Promise<FileMetadata>;

  save(meta: FileMetadata): Promise<string | number>;

  update(name: string, metadata: Partial<FileMetadata>): Promise<boolean>;

  delete(name: string): Promise<boolean>;

  filesResource(meta: FileMetadata): Promise<any>;

  filePropsMeta(name: string): Promise<FilePropsMeta>;

  fileProps(meta: FileMetadata): Promise<FileProps>;

  modelName(model: any): string;

  modelFields(model: any): string[];
}
