import { Schema as MongooseSchema } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Field, HideField, ID, ObjectType } from '@nestjs/graphql';
import {
  CreatorProp,
  MongooseSchemaFactory,
  ResourceSchema,
  VirtualProp
} from 'ivy-nestjs/resource';
import { Application } from '@resources/applications/schema';
import { User } from '@resources/users/schema';
import { FileProp } from 'ivy-nestjs/storage';
import { File } from 'ivy-nestjs/storage/schema';
import { Role } from 'ivy-nestjs/enums';
import { Plan } from '@resources/plans/schema';

@ObjectType()
@Schema({ timestamps: true })
export class Project extends ResourceSchema {
  @ApiProperty({ name: 'id' })
  @Field(() => ID, { name: 'id' })
  _id: string;

  @Prop()
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', populate: true })
  owner?: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', populate: true })
  plan: Plan;

  @VirtualProp({
    ref: 'Application',
    localField: '_id',
    foreignField: 'project',
    populate: true
  })
  applications?: Application[];

  @FileProp({
    access: 'protected',
    mimeType: '*/*',
    maxSize: '1.5 GB',
    maxCount: 8,
    isArray: true,
    policy: (user, meta, res) => {
      return user.hasRole(Role.Admin) || user.getId().equals(res.createdBy);
    }
  })
  documents?: File[];

  @ApiHideProperty()
  @HideField()
  @CreatorProp({ ref: 'User' })
  createdBy?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ProjectSchema =
  MongooseSchemaFactory.createForClass<Project>(Project);
