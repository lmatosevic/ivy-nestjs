import { Document } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ObjectType } from '@nestjs/graphql';
import { IdProp, MongooseSchemaFactory, VirtualProp } from 'ivy-nestjs/resource';
import { Project } from '@resources/projects/schema';
import { Feature, FeatureSchema } from '@resources/features/schema';
import { FileProp } from 'ivy-nestjs';
import { File } from 'ivy-nestjs/storage/schema';

@ObjectType()
@Schema({ timestamps: true })
export class Plan extends Document {
  @IdProp()
  id: string;

  @Prop()
  name: string;

  @VirtualProp({ ref: 'Project', justOne: true, populate: true })
  project?: Project;

  @Prop({ type: [FeatureSchema], default: [] })
  features?: Feature[];

  @FileProp({ maxSize: 3145728, maxCount: 5, isArray: true })
  files?: File[];

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PlanSchema = MongooseSchemaFactory.createForClass<Plan>(Plan);
