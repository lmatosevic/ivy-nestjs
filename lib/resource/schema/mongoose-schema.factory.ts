import { Type } from '@nestjs/common';
import { SchemaFactory } from '@nestjs/mongoose';
import { Schema } from 'mongoose';
import { VIRTUAL_PROPS_KEY } from '../resource/decorators';

export class MongooseSchemaFactory {
  public static createForClass<T>(target: Type): Schema<T> {
    const schema = SchemaFactory.createForClass(target);

    schema['classRef'] = target;

    const proto = target.prototype;
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name !== 'constructor' && typeof proto[name] === 'function') {
        schema.methods[name] = proto[name];
      }
    }

    for (const name of Object.getOwnPropertyNames(target)) {
      if (name !== 'constructor' && typeof target[name] === 'function') {
        schema.statics[name] = target[name];
      }
    }

    const virtualFields = Reflect.getMetadata(VIRTUAL_PROPS_KEY, proto);
    if (virtualFields) {
      for (const [prop, config] of Object.entries(virtualFields)) {
        schema.virtual(prop, config);
      }
    }

    const deleteFromJSON = [];
    for (const [prop, config] of Object.entries(schema.obj)) {
      if (config['toJSON'] === false) {
        deleteFromJSON.push(prop);
      }
    }

    schema.set('toJSON', {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        for (const deleteField of deleteFromJSON) {
          delete ret[deleteField];
        }
        return { id: ret.id, ...ret };
      }
    });

    schema.set('toObject', {
      virtuals: true
    });

    return schema;
  }
}
