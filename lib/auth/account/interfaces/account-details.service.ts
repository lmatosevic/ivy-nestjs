import { PartialDeep } from 'type-fest';
import { AuthSource } from '../../../enums';
import { AuthUser } from '../../interfaces';

export interface AccountDetailsService<T extends AuthUser> {
  findByUsername(username: string): Promise<T>;

  registerUser(userData: PartialDeep<T>, source: AuthSource): Promise<T>;

  identifierAvailable(field: string, value: any): Promise<boolean>;

  verifyAccount(id: number | string): Promise<boolean>;

  updatePassword(id: number | string, password: string): Promise<boolean>;
}
