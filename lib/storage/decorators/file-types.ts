import { AuthUser } from '../../auth';
import { FileMetadata } from '../file-meta';

export const FILE_PROPS_KEY = 'fileProps';

export type FileAccessPolicyFn = (user: AuthUser, meta: FileMetadata, resource: any) => boolean;

export interface FileProps {
  access?: 'public' | 'protected' | 'private';
  mimeType?: string | RegExp;
  maxCount?: number;
  maxSize?: number | string; // bytes or value with size unit (e.g. 1.5mb)
  isArray?: boolean;
  policy?: FileAccessPolicyFn;
  exclude?: boolean;
}
