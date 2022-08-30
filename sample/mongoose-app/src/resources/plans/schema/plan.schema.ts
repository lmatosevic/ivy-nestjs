import { Document } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MongooseSchemaFactory, VirtualProp } from 'ivy-nestjs/resource';
import { Project } from '@resources/projects/schema';
import { Feature, FeatureSchema } from '@resources/features/schema';
import { FileProp } from 'ivy-nestjs';
import { File } from 'ivy-nestjs/storage/schema';

@ObjectType()
@Schema({ timestamps: true })
export class Plan extends Document {
  @ApiProperty({ name: 'id' })
  @Field(() => ID, { name: 'id' })
  _id: string;

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
