export const ID_PROPS_KEY = 'idProps';

export interface IdProps {
  toJSON?: boolean;
}

export function IdProp(config: IdProps = {}) {
  return function (target: Object, propertyKey: string) {
    const idData = Reflect.getMetadata(ID_PROPS_KEY, target) || {};
    idData[propertyKey] = config;
    Reflect.defineMetadata(ID_PROPS_KEY, idData, target);
  };
}
