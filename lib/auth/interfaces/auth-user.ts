import { AuthSource, Role } from '../../enums';

export interface AuthUser {
  passwordHash?: string;
  roles?: Role[];
  role?: Role;
  authSource?: AuthSource;
  enabled?: boolean;
  verified?: boolean;
  loginAt?: Date;
  logoutAt?: Date;

  getId(): string | any;

  getEmail(): string;

  getUsername(): string;

  setUsername(name: string): void;

  hasRole(role: Role): boolean;
}
