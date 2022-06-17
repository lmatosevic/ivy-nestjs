import { classToPlain } from 'class-transformer';
import { AuthUser } from '../../auth/interfaces';

export abstract class ResourceEntity {
  id: number;

  createdBy?: number | AuthUser;

  createdAt?: Date;

  updatedAt?: Date;

  toJSON(): Record<string, any> {
    return classToPlain(this);
  }
}
