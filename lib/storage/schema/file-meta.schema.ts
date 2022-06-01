import { Document, Schema as MongooseSchema } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiHideProperty } from '@nestjs/swagger';
import { HideField, ObjectType } from '@nestjs/graphql';
import { MongooseSchemaFactory } from '../../resource/schema';

@ObjectType()
@Schema({ timestamps: true })
export class FileMeta extends Document {
  @ApiHideProperty()
  @HideField()
  @Prop({ toJSON: false })
  id: string;

  @ApiHideProperty()
  @HideField()
  @Prop({ unique: true, toJSON: false })
  name: string;

  @ApiHideProperty()
  @HideField()
  @Prop({ toJSON: false })
  resource: string;

  @ApiHideProperty()
  @HideField()
  @Prop({ type: MongooseSchema.Types.ObjectId, toJSON: false })
  resourceId: string;

  @ApiHideProperty()
  @HideField()
  @Prop({ toJSON: false })
  field: string;

  @Prop()
  mimeType?: string;

  @Prop()
  size?: number;

  createdAt?: Date;

  @ApiHideProperty()
  @HideField()
  @Prop({ toJSON: false })
  updatedAt?: Date;
}

export const FileMetaSchema = MongooseSchemaFactory.createForClass<FileMeta>(FileMeta);
