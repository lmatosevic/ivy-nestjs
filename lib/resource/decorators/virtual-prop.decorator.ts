import { VirtualTypeOptions } from 'mongoose';

export const VIRTUAL_PROPS_KEY = 'virtualProps';

export interface VirtualRefProps {
  populate?: boolean;
  excludeFields?: string[];
  onDelete?: 'setNull' | 'cascade' | 'none';
}

export function VirtualProp(config: VirtualTypeOptions & VirtualRefProps) {
  return (target: Object, propertyKey: string) => {
    const virtualData = Reflect.getMetadata(VIRTUAL_PROPS_KEY, target) || {};
    virtualData[propertyKey] = config;
    Reflect.defineMetadata(VIRTUAL_PROPS_KEY, virtualData, target);
  };
}
