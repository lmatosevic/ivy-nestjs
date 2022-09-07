import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { PartialDeep } from 'type-fest';
import { AuthUser, UserDetailsService } from '../interfaces';
import { AuthSource, Role } from '../../enums';
import { ResourceEntity } from '../../resource';
import { AccountDetailsService } from '../account/interfaces';
import { TypeOrmResourceService } from '../../resource/services';
import { FileManager } from '../../storage/file-manager';

export abstract class TypeOrmUserDetailsService<T extends AuthUser>
  extends TypeOrmResourceService<T & ResourceEntity>
  implements UserDetailsService<T>, AccountDetailsService<T>
{
  protected constructor(
    protected repository: Repository<T & ResourceEntity>,
    protected fileManager?: FileManager
  ) {
    super(repository, fileManager);
  }

  async create(createDto: PartialDeep<T & ResourceEntity>): Promise<T & ResourceEntity> {
    const passwordHash = await this.hashPassword(createDto['password']);
    return super.create({ ...createDto, passwordHash } as PartialDeep<T & ResourceEntity>);
  }

  async update(
    id: number | string,
    updateDto: PartialDeep<T & ResourceEntity>,
    isFileUpload?: boolean
  ): Promise<T & ResourceEntity> {
    if (updateDto['password']) {
      updateDto['passwordHash'] = await this.hashPassword(updateDto['password']);
      updateDto['logoutAt'] = new Date();
      delete updateDto['password'];
    }
    return super.update(id, updateDto as PartialDeep<T & ResourceEntity>, isFileUpload);
  }

  async find(id: number): Promise<T & ResourceEntity> {
    return super.asProtected().find(id);
  }

  async findByUsername(username: string): Promise<T> {
    let resp = await this.asProtected().query({ filter: { email: username } });
    return resp.resultCount > 0 ? resp.items[0] : null;
  }

  async onLogin(user: T): Promise<boolean> {
    return !!(await super.update(user.getId(), { loginAt: new Date() } as PartialDeep<T & ResourceEntity>));
  }

  async onLogout(user: T): Promise<boolean> {
    return !!(await super.update(user.getId(), { logoutAt: new Date() } as PartialDeep<T & ResourceEntity>));
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
    return await this.create(userData as PartialDeep<T & ResourceEntity>);
  }

  async identifierAvailable(field: string, value: any): Promise<boolean> {
    const filter = { [field]: value } as any;
    const resp = await this.query({ filter });
    return resp.resultCount === 0;
  }

  async updatePassword(id: string, password: string): Promise<boolean> {
    return !!(await this.update(id, { password } as PartialDeep<T & ResourceEntity>));
  }

  async verifyAccount(id: string): Promise<boolean> {
    return !!(await super.update(id, { verified: true } as PartialDeep<T & ResourceEntity>));
  }
}
