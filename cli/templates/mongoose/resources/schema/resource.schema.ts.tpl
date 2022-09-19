import { Document } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ObjectType } from '@nestjs/graphql';
import { IdProp, MongooseSchemaFactory } from 'ivy-nestjs/resource';

@ObjectType()
@Schema({ timestamps: true })
export class {{resourceModelName}} extends Document {
  @IdProp()
  id: string;

  @Prop()
  name: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const {{resourceSchemaName}} = MongooseSchemaFactory.createForClass<{{resourceModelName}}>({{resourceModelName}});
