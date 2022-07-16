import { Document } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MongooseSchemaFactory } from 'ivy-nestjs/resource';
import { FileProp } from 'ivy-nestjs';
import { File } from 'ivy-nestjs/storage/entity';

@ObjectType()
@Schema({ timestamps: true, autoCreate: false })
export class Feature extends Document {
  @ApiProperty({ name: 'id' })
  @Field(() => ID, { name: 'id' })
  _id: string;

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
