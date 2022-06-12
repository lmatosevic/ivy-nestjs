import { AuthSource, Role } from '../../enums';

export interface AuthUser {
  passwordHash?: string;
  roles?: Role[];
  role?: Role;
  authSource?: AuthSource;
  enabled?: boolean;
  loginAt?: Date;
  logoutAt?: Date;

  getId(): string | any;

  getUsername(): string;

  setUsername(name: string): void;

  hasRole(role: Role): boolean;
}
