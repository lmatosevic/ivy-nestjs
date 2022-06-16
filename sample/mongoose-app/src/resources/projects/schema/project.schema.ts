import { Document, Schema as MongooseSchema } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MongooseSchemaFactory, VirtualProp } from 'ivy-nestjs/resource';
import { Application } from '@resources/applications/schema';
import { User } from '@resources/users/schema';
import { FileProp } from 'ivy-nestjs/storage';
import { File } from 'ivy-nestjs/storage/schema';
import { Role } from 'ivy-nestjs/enums';

@ObjectType()
@Schema({ timestamps: true })
export class Project extends Document {
  @ApiProperty({ name: 'id' })
  @Field(() => ID, { name: 'id' })
  _id: string;

  @Prop()
  name?: string;

  @Prop()
  description?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', populate: true })
  owner?: User;

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

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  createdBy?: string;
}

export const ProjectSchema = MongooseSchemaFactory.createForClass<Project>(Project);
