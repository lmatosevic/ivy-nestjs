import { Document, Schema as MongooseSchema } from 'mongoose';
import { Prop, Schema } from '@nestjs/mongoose';
import { ObjectType } from '@nestjs/graphql';
import { IdProp, MongooseSchemaFactory, VirtualProp } from 'ivy-nestjs/resource';

@ObjectType()
@Schema({ timestamps: true })
export class Category extends Document {
  @IdProp()
  id: string;

  @Prop()
  name: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Category',
    excludeFields: ['children', 'parent'],
    populate: true
  })
  parent?: Category;

  @VirtualProp({
    ref: 'Category',
    foreignField: 'parent',
    populate: true,
    maxDepth: 5
  })
  children?: Category[];

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const CategorySchema = MongooseSchemaFactory.createForClass<Category>(Category);
