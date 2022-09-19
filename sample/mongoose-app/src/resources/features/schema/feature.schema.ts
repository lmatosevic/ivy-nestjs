import { Document } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ObjectType } from '@nestjs/graphql';
import { IdProp, MongooseSchemaFactory } from 'ivy-nestjs/resource';
import { FileProp } from 'ivy-nestjs';
import { File } from 'ivy-nestjs/storage/schema';

@ObjectType()
@Schema({ timestamps: true, autoCreate: false })
export class Feature extends Document {
  @IdProp()
  id: string;

  @Prop()
  name: string;

  @FileProp({ maxSize: 3145728 })
  file?: File;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const FeatureSchema = MongooseSchemaFactory.createForClass<Feature>(Feature);
