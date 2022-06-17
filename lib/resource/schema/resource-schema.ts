import { Document } from 'mongoose';
import { AuthUser } from '../../auth';

export abstract class ResourceSchema extends Document {
  _id: string;

  createdBy?: string | AuthUser;

  createdAt?: Date;

  updatedAt?: Date;
}
