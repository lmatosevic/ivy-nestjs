import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ReflectionUtil, StringUtil } from '../utils';
import { StatusResponse } from '../resource';
import { AuthUser, UserDetailsService } from './interfaces';
import { AuthModuleOptions, AuthRouteOptions } from './auth.module';
import { JwtPayload, JwtToken } from './strategy/jwt/jwt.dto';
import { AuthorizationError } from './errors';
import { AUTH_MODULE_OPTIONS } from './auth.constants';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);
  private readonly userDetailsService: UserDetailsService<AuthUser>;

  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
    private configService: ConfigService,
    private jwtService: JwtService
  ) {
    this.userDetailsService = this.authModuleOptions.userDetailsService;
  }

  updateAuthRoutes(prototype: any): void {
    const login = this.authModuleOptions.login ?? this.configService.get<AuthRouteOptions>('auth.login');
    const logout = this.authModuleOptions.logout ?? this.configService.get<AuthRouteOptions>('auth.logout');
    ReflectionUtil.updateAuthRoutes(prototype, { login, logout });
  }

  async onApplicationBootstrap(): Promise<void> {
    if (this.authModuleOptions.admin?.create ?? this.configService.get('auth.admin.create')) {
      await this.createAdminUser();
    }
  }

  async findUser(username: string): Promise<AuthUser> {
    return await this.userDetailsService.findByUsername(username);
  }

  async validateUser(username: string, password: string): Promise<AuthUser | null> {
    const user = await this.findUser(username);
    if (!user || !user.enabled) {
      return null;
    }
    const isMatch = await this.userDetailsService.checkPassword(password, user.passwordHash);
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
      result = await this.userDetailsService.onLogin(user);
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
      const success = await this.userDetailsService.onLogout(user);
      return { success, message: 'User successfully logged out' };
    } catch (e) {
      this.logger.warn(e);
      throw new AuthorizationError('Unauthorized', 401);
    }
  }

  private async createAdminUser(): Promise<void> {
    const username = this.authModuleOptions.admin?.username ?? this.configService.get('auth.admin.username');
    let password = this.authModuleOptions.admin?.password ?? this.configService.get('auth.admin.password');

    let tries = 5;
    let adminUser = undefined;
    while (adminUser === undefined && tries > 0) {
      tries--;
      try {
        adminUser = await this.userDetailsService.findByUsername(username);
      } catch (e) {
        this.logger.log('Waiting for connection...');
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    if (!adminUser && adminUser !== undefined) {
      if (!password) {
        password = StringUtil.randomString(12);
        this.logger.log('Generated admin user password: ' + password);
      }
      adminUser = await this.userDetailsService.createAdmin(username, password);
      this.logger.log('Created admin user with ID: ' + adminUser['id']);
    } else if (adminUser) {
      this.logger.log('Admin user ID: ' + adminUser['id']);
    }
  }
}
