import { Document } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MongooseSchemaFactory, VirtualProp } from 'ivy-nestjs/resource';
import { Plan } from '@resources/plans/schema';

@ObjectType()
@Schema({ timestamps: true })
export class Feature extends Document {
  @ApiProperty({ name: 'id' })
  @Field(() => ID, { name: 'id' })
  _id: string;

  @Prop()
  name: string;

  @VirtualProp({ ref: 'Plan', foreignField: 'features', justOne: true, populate: true })
  plan?: Plan;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const FeatureSchema = MongooseSchemaFactory.createForClass<Feature>(Feature);
