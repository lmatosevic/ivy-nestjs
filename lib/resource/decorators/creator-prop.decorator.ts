import { Schema as MongooseSchema } from 'mongoose';
import { Prop, PropOptions } from '@nestjs/mongoose';

export const CREATOR_PROP_KEY = 'creatorProp';

export interface CreatorPropConfig {
  ref: string;
  type?: any;
}

export function CreatorProp(config: PropOptions & CreatorPropConfig) {
  const { ref, type } = config;

  return (target: Object, propertyKey: string) => {
    Prop({
      default: null,
      ...(config as Object),
      type: type ? type : MongooseSchema.Types.ObjectId,
      ref: ref
    })(target, propertyKey);

    const creatorProp = Reflect.getMetadata(CREATOR_PROP_KEY, target) || {};
    creatorProp[propertyKey] = config;
    Reflect.defineMetadata(CREATOR_PROP_KEY, creatorProp, target);
  };
}
