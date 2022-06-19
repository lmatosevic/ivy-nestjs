import { VirtualTypeOptions } from 'mongoose';

export const VIRTUAL_PROPS_KEY = 'virtualProps';

export interface VirtualRefProps {
  populate?: boolean;
  excludeFields?: string[];
  onDelete?: 'setNull' | 'cascade' | 'none';
}

export function VirtualProp(config: VirtualTypeOptions & VirtualRefProps) {
  return function (target: Object, propertyKey: string) {
    if (config.ref && !config.localField) {
      config.localField = '_id';
    }
    if (config.ref && !config.foreignField) {
      config.foreignField = target.constructor?.name?.toLowerCase();
    }
    if (config.ref && config.justOne === undefined) {
      const designType = Reflect.getMetadata("design:type", target, propertyKey);
      config.justOne = designType?.name !== 'Array';
    }
    const virtualData = Reflect.getMetadata(VIRTUAL_PROPS_KEY, target) || {};
    virtualData[propertyKey] = config;
    Reflect.defineMetadata(VIRTUAL_PROPS_KEY, virtualData, target);
  };
}
