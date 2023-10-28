import { AuthUser } from '../../auth';

interface AuthorizedUser extends AuthUser {}

export abstract class ResourceSchema {
  id: string;

  createdBy?: string | AuthorizedUser;

  createdAt?: Date;

  updatedAt?: Date;
}
