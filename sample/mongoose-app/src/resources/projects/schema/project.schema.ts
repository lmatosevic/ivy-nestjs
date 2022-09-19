import { Schema as MongooseSchema } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiHideProperty } from '@nestjs/swagger';
import { HideField, ObjectType } from '@nestjs/graphql';
import { CreatorProp, IdProp, MongooseSchemaFactory, ResourceSchema, VirtualProp } from 'ivy-nestjs/resource';
import { Application } from '@resources/applications/schema';
import { User } from '@resources/users/schema';
import { FileProp } from 'ivy-nestjs/storage';
import { File } from 'ivy-nestjs/storage/schema';
import { Role } from 'ivy-nestjs/enums';
import { Plan } from '@resources/plans/schema';

@ObjectType()
@Schema({ timestamps: true })
export class Project extends ResourceSchema {
  @IdProp()
  id: string;

  @Prop()
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', populate: true })
  owner?: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Plan', populate: true })
  plan: Plan;

  @VirtualProp({ ref: 'Application', populate: true })
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

  @Prop({ default: 1 })
  score?: number;

  @ApiHideProperty()
  @HideField()
  @CreatorProp({ ref: 'User', toJSON: false })
  createdBy?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ProjectSchema = MongooseSchemaFactory.createForClass<Project>(Project);
