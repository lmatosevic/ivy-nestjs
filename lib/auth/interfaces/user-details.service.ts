import { AuthSource } from '../../enums';
import { AuthUser } from './auth-user';

export interface UserDetailsService<T extends AuthUser> {
  find(id: string): Promise<T>;

  findByUsername(username: string): Promise<T>;

  onLogin(user: T): Promise<boolean>;

  onLogout(user: T): Promise<boolean>;

  checkPassword(password: string, passwordHash: string): Promise<boolean>;

  hashPassword(password: string): Promise<string>;

  register(userData: Partial<T>, source: AuthSource): Promise<T>;

  identifierAvailable(field: string, value: any): Promise<boolean>;
}
