import { Document, Schema as MongooseSchema } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MongooseSchemaFactory, VirtualProp } from 'ivy-nestjs/resource';
import { Project } from '@resources/projects/schema';
import { Feature } from '@resources/features/schema';

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

  @Prop({
    type: [
      { type: MongooseSchema.Types.ObjectId, ref: 'Feature', populate: true }
    ]
  })
  features?: Feature[];

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PlanSchema = MongooseSchemaFactory.createForClass<Plan>(Plan);
