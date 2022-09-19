import { Schema as MongooseSchema } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiHideProperty } from '@nestjs/swagger';
import { HideField, ObjectType } from '@nestjs/graphql';
import { IdProp } from '../../resource/decorators/id-prop.decorator';
import { MongooseSchemaFactory, ResourceSchema } from '../../resource/schema';

@ObjectType('FileMetaSchema')
@Schema({ timestamps: true })
export class FileMeta extends ResourceSchema {
  @ApiHideProperty()
  @HideField()
  @IdProp({ toJSON: false })
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
  resourceId?: string;

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
