import { Schema as MongooseSchema } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Field, ObjectType, ID } from '@nestjs/graphql';
import { MongooseSchemaFactory, ResourceSchema } from 'ivy-nestjs/resource';
import { Project } from '@resources/projects/schema';
import { User } from '@resources/users/schema';

@ObjectType()
@Schema({ timestamps: true })
export class Application extends ResourceSchema {
  @ApiProperty({ name: 'id' })
  @Field(() => ID, { name: 'id' })
  _id: string;

  @Prop()
  title: string;

  @Prop({ type: Date })
  scheduledAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', populate: true })
  project: Project;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User', populate: true }] })
  reviewers?: User[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  createdBy?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ApplicationSchema = MongooseSchemaFactory.createForClass<Application>(Application);
