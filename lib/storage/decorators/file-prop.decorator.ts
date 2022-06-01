import { Prop, PropOptions } from '@nestjs/mongoose';
import { FileSchema } from '../schema';
import { FileMetadata } from '../file-meta';
import { AuthUser } from '../../auth';

export const FILE_PROPS_KEY = 'fileProps';

export type FileAccessPolicyFn = (
  user: AuthUser,
  meta: FileMetadata,
  resource: any
) => boolean;

export interface FileProps {
  access?: 'public' | 'protected' | 'private';
  mimeType?: string | RegExp;
  maxCount?: number;
  maxSize?: number | string; // bytes or value with size unit (e.g. 1.5mb)
  isArray?: boolean;
  policy?: FileAccessPolicyFn;
}

export function FileProp(config: PropOptions & FileProps = {}) {
  if (!('type' in config)) {
    config['type'] = config.isArray ? [FileSchema] : FileSchema;
  }
  if (!('default' in config)) {
    config['default'] = null;
  }

  if (['public', 'private'].includes(config.access) && config.policy) {
    throw Error(`Cannot use file policy function with "${config.access}" access type`);
  }
  if (!config.access && config.policy) {
    config.access = 'protected';
  }

  return (target: Object, propertyKey: string) => {
    Prop(config)(target, propertyKey);
    const virtualData = Reflect.getMetadata(FILE_PROPS_KEY, target) || {};
    virtualData[propertyKey] = config;
    Reflect.defineMetadata(FILE_PROPS_KEY, virtualData, target);
  };
}
