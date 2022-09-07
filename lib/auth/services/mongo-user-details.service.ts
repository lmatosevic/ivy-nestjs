import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { PartialDeep } from 'type-fest';
import { AuthUser, UserDetailsService } from '../interfaces';
import { AuthSource, Role } from '../../enums';
import { ResourceSchema } from '../../resource';
import { AccountDetailsService } from '../account/interfaces';
import { MongoResourceService } from '../../resource/services';
import { FileManager } from '../../storage/file-manager';

export abstract class MongoUserDetailsService<T extends AuthUser>
  extends MongoResourceService<T>
  implements UserDetailsService<T>, AccountDetailsService<T>
{
  protected constructor(protected model: Model<T & ResourceSchema>, protected fileManager?: FileManager) {
    super(model, fileManager);
  }

  async create(createDto: PartialDeep<T>): Promise<T> {
    const passwordHash = await this.hashPassword(createDto['password']);
    return super.create({ ...createDto, passwordHash });
  }

  async update(id: string, updateDto: PartialDeep<T>, isFileUpload?: boolean): Promise<T> {
    if (updateDto['password']) {
      updateDto['passwordHash'] = await this.hashPassword(updateDto['password']);
      updateDto['logoutAt'] = new Date();
      delete updateDto['password'];
    }
    return super.update(id, updateDto, isFileUpload);
  }

  async findByUsername(username: string): Promise<T> {
    let resp = await this.asProtected().query({ filter: { email: username } });
    return resp.resultCount > 0 ? resp.items[0] : null;
  }

  async onLogin(user: T): Promise<boolean> {
    return !!(await super.update(user.getId(), { loginAt: new Date() } as PartialDeep<T>));
  }

  async onLogout(user: T): Promise<boolean> {
    return !!(await super.update(user.getId(), { logoutAt: new Date() } as PartialDeep<T>));
  }

  async checkPassword(password: string, passwordHash: string): Promise<boolean> {
    return await bcrypt.compare(password, passwordHash);
  }

  async hashPassword(password: string): Promise<string> {
    if (!password) {
      return undefined;
    }
    const salt = await bcrypt.genSalt();
    return await bcrypt.hash(password, salt);
  }

  async createAdmin(username: string, password: string): Promise<T> {
    return this.create({
      firstName: 'Admin',
      lastName: 'Admin',
      email: username,
      password: password,
      authSource: AuthSource.Local,
      roles: [Role.Admin],
      role: Role.Admin
    } as any);
  }

  async registerUser(userData: PartialDeep<T>, source: AuthSource = AuthSource.Local): Promise<T> {
    userData['authSource'] = source;
    userData['roles'] = [Role.User];
    userData['role'] = Role.User;
    return await this.create(userData);
  }

  async identifierAvailable(field: string, value: any): Promise<boolean> {
    const filter = { [field]: value } as any;
    const resp = await this.query({ filter });
    return resp.resultCount === 0;
  }

  async updatePassword(id: string, password: string): Promise<boolean> {
    return !!(await this.update(id, { password } as PartialDeep<T>));
  }

  async verifyAccount(id: string): Promise<boolean> {
    return !!(await super.update(id, { verified: true } as PartialDeep<T>));
  }
}
