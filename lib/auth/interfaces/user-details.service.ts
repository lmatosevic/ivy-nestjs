import { AuthUser } from './auth-user';

export interface UserDetailsService<T extends AuthUser> {
  find(id: string | number): Promise<T>;

  findByUsername(username: string): Promise<T>;

  onLogin(user: T): Promise<boolean>;

  onLogout(user: T): Promise<boolean>;

  checkPassword(password: string, passwordHash: string): Promise<boolean>;

  hashPassword(password: string): Promise<string>;

  createAdmin(username: string, password: string): Promise<T>;
}
