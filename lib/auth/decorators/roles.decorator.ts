import { Role } from '../../enums';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => {
  return (target: Object, _: string) => {
    Reflect.defineMetadata(ROLES_KEY, roles, target);
  }
}
