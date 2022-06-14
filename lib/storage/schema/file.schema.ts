import { Document, Schema as MongooseSchema } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiHideProperty } from '@nestjs/swagger';
import { HideField, ObjectType } from '@nestjs/graphql';
import { MongooseSchemaFactory } from '../../resource/schema';
import { FileMeta } from './file-meta.schema';

@ObjectType('FileSchema')
@Schema({ timestamps: false })
export class File extends Document {
  @ApiHideProperty()
  @HideField()
  @Prop({ toJSON: false })
  id: string;

  @Prop()
  data: string;

  @Prop({ default: null })
  originalName?: string;

  @Prop({ default: null })
  title?: string;

  @Prop({ default: null })
  description?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'FileMeta', populate: true })
  meta?: FileMeta;
}

export const FileSchema = MongooseSchemaFactory.createForClass<File>(File);
