import { Prop, PropOptions } from '@nestjs/mongoose';
import { FILE_PROPS_KEY, FileProps } from './file-types';
import { FileSchema } from '../schema';

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
