import { classToPlain } from 'class-transformer';
import { AuthUser } from '../../auth/interfaces';

interface AuthorizedUser extends AuthUser {}

export abstract class ResourceEntity {
  id: string | number;

  createdBy?: number | AuthorizedUser;

  createdAt?: Date;

  updatedAt?: Date;

  toJSON(): Record<string, any> {
    return classToPlain(this);
  }
}
