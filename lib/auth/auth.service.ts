import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthSource } from '../enums';
import { StringUtil } from '../utils';
import { StatusResponse } from '../resource';
import { AuthUser } from './interfaces';
import { AuthModuleOptions } from './auth.module';
import { JwtPayload, JwtToken } from './strategy/jwt/jwt.dto';
import { AuthorizationError } from './errors';
import { AUTH_MODULE_OPTIONS } from './auth.constants';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
    private configService: ConfigService,
    private jwtService: JwtService
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.authModuleOptions.admin?.create ?? this.configService.get('auth.admin.create')) {
      await this.createAdminUser();
    }
  }

  async findUser(username: string): Promise<AuthUser> {
    return await this.authModuleOptions.userDetailsService.findByUsername(username);
  }

  async validateUser(username: string, password: string): Promise<AuthUser | null> {
    const user = await this.findUser(username);
    if (!user || !user.enabled) {
      return null;
    }
    const isMatch = await this.authModuleOptions.userDetailsService.checkPassword(
      password,
      user.passwordHash
    );
    return isMatch ? user : null;
  }

  async login(user: AuthUser): Promise<JwtToken> {
    const payload: JwtPayload = {
      username: user.getUsername(),
      sub: user.getId(),
      iat: new Date().getTime()
    };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync({ ...payload, refresh: true });

    let result;
    try {
      result = await this.authModuleOptions.userDetailsService.onLogin(user);
    } catch (e) {
      this.logger.warn(e);
    }
    if (!result) {
      throw new AuthorizationError('Invalid credentials');
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: this.authModuleOptions.jwt?.expiresIn ?? this.configService.get('auth.jwt.expiresIn')
    };
  }

  async logout(user: AuthUser): Promise<StatusResponse> {
    try {
      const success = await this.authModuleOptions.userDetailsService.onLogout(user);
      return { success, message: 'User successfully logged out' };
    } catch (e) {
      this.logger.warn(e);
      throw new AuthorizationError('Unauthorized', 401);
    }
  }

  async register(data: any, source: AuthSource = AuthSource.Local): Promise<AuthUser | null> {
    const registration = this.authModuleOptions.registration ?? this.configService.get('auth.registration');
    if (registration === false) {
      throw new AuthorizationError('Registration is not supported');
    }
    return await this.authModuleOptions.userDetailsService.registerUser(data, source);
  }

  async identifierAvailable(field: string, value: string): Promise<StatusResponse> {
    if (!field || !value) {
      throw new AuthorizationError('Missing required query parameters "field" and/or "value');
    }
    const success = await this.authModuleOptions.userDetailsService.identifierAvailable(field, value);
    return { success, message: `Requested value for "${field}" is ${success ? 'available' : 'unavailable'}` };
  }

  private async createAdminUser(): Promise<void> {
    const username = this.authModuleOptions.admin?.username ?? this.configService.get('auth.admin.username');
    let password = this.authModuleOptions.admin?.password ?? this.configService.get('auth.admin.password');

    let adminUser = await this.authModuleOptions.userDetailsService.findByUsername(username);

    if (!adminUser) {
      if (!password) {
        password = StringUtil.randomString(12);
        this.logger.log('Generated admin user password: ' + password);
      }
      adminUser = await this.authModuleOptions.userDetailsService.createAdmin(username, password);
      this.logger.log('Created admin user with ID: ' + adminUser['id']);
    } else {
      this.logger.log('Admin user ID: ' + adminUser['id']);
    }
  }
}
