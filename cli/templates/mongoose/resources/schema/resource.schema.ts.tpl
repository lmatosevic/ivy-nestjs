import { Document } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MongooseSchemaFactory } from 'ivy-nestjs/resource';

@ObjectType()
@Schema({ timestamps: true })
export class {{resourceModelName}} extends Document {
  @ApiProperty({ name: 'id' })
  @Field(() => ID, { name: 'id' })
  _id: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const {{resourceSchemaName}} = MongooseSchemaFactory.createForClass<{{resourceModelName}}>({{resourceModelName}});
