import { Document } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MongooseSchemaFactory, VirtualProp } from 'ivy-nestjs/resource';
import { Project } from '@resources/projects/schema';

@ObjectType()
@Schema({ timestamps: true })
export class Plan extends Document {
  @ApiProperty({ name: 'id' })
  @Field(() => ID, { name: 'id' })
  _id: string;

  @Prop()
  name: string;

  @VirtualProp({
    ref: 'Project',
    localField: '_id',
    foreignField: 'plan',
    populate: true
  })
  project: Project;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PlanSchema = MongooseSchemaFactory.createForClass<Plan>(Plan);
