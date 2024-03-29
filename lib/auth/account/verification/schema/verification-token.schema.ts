import { ObjectType } from '@nestjs/graphql';
import { Prop, Schema } from '@nestjs/mongoose';
import { VerificationType } from '../../../../enums';
import { IdProp } from '../../../../resource/decorators/id-prop.decorator';
import { MongooseSchemaFactory } from '../../../../resource/schema/mongoose-schema.factory';
import { ResourceSchema } from '../../../../resource/schema/resource-schema';

@ObjectType('VerificationTokenSchema')
@Schema({ timestamps: true })
export class VerificationToken extends ResourceSchema {
  @IdProp()
  id: string;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ default: VerificationType.Other })
  type?: VerificationType;

  @Prop({ required: true })
  accountId: string;

  @Prop()
  expiresAt?: Date;

  @Prop()
  usedAt?: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const VerificationTokenSchema = MongooseSchemaFactory.createForClass<VerificationToken>(VerificationToken);
