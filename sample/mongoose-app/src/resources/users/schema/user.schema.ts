import { Prop, Schema } from '@nestjs/mongoose';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Field, HideField, ID, ObjectType } from '@nestjs/graphql';
import { AuthSource, Role } from 'ivy-nestjs/enums';
import { AuthUser } from 'ivy-nestjs/auth';
import { CreatorProp, MongooseSchemaFactory, ResourceSchema, VirtualProp } from 'ivy-nestjs/resource';
import { FileProp } from 'ivy-nestjs/storage';
import { File } from 'ivy-nestjs/storage/schema';
import { Project } from '@resources/projects/schema';
import { Application } from '@resources/applications/schema';

@ObjectType()
@Schema({ timestamps: true })
export class User extends ResourceSchema implements AuthUser {
  @ApiProperty({ name: 'id' })
  @Field(() => ID, { name: 'id' })
  _id: string;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop({ required: true, unique: true })
  email?: string;

  @Prop({ default: [Role.User] })
  roles?: Role[];

  @ApiHideProperty()
  @HideField()
  @Prop({ default: AuthSource.Local, toJSON: false })
  authSource?: AuthSource;

  @ApiHideProperty()
  @HideField()
  @Prop({ toJSON: false })
  passwordHash?: string;

  @Prop({ default: false })
  consent?: boolean;

  @Prop({ default: false })
  verified?: boolean;

  @Prop({ default: true })
  enabled?: boolean;

  @Prop()
  loginAt?: Date;

  @Prop()
  logoutAt?: Date;

  @FileProp({ mimeType: 'image/(jpg|jpeg|png|gif)', maxSize: 1235128 })
  avatar?: File;

  @VirtualProp({
    ref: 'Project',
    foreignField: 'owner',
    populate: true
  })
  projects?: Project[];

  @VirtualProp({
    ref: 'Application',
    foreignField: 'reviewers',
    populate: true
  })
  reviewedApps?: Application[];

  @ApiHideProperty()
  @HideField()
  @CreatorProp({ ref: 'User' })
  createdBy?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  getId(): string {
    return this._id;
  }

  getEmail(): string {
    return this.email;
  }

  getUsername(): string {
    return this.email;
  }

  setUsername(name: string): void {
    this.email = name;
  }

  hasRole(role: Role): boolean {
    return this.roles?.includes(role);
  }
}

export const UserSchema = MongooseSchemaFactory.createForClass<User>(User);
