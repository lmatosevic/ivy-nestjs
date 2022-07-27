import { ManyToOne, RelationOptions } from 'typeorm';
import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Field } from '@nestjs/graphql';

export const CREATOR_COLUMN_KEY = 'creatorColumn';

export interface CreatorColumnConfig {
  type: () => Type<unknown>;
  expose?: boolean;
}

export function CreatorColumn(config: RelationOptions & CreatorColumnConfig) {
  const { type, expose, ...colConf } = config;

  return (target: Object, propertyKey: string) => {
    Field(type)(target, propertyKey);
    if (expose) {
      ApiProperty({ type })(target, propertyKey);
    }
    ManyToOne(type, { nullable: true, ...colConf })(target, propertyKey);

    const creatorColumn = Reflect.getMetadata(CREATOR_COLUMN_KEY, target) || {};
    creatorColumn[propertyKey] = config;
    Reflect.defineMetadata(CREATOR_COLUMN_KEY, creatorColumn, target);
  };
}
