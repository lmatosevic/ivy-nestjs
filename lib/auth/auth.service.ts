import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthSource } from '../enums';
import { AuthUser } from './interfaces';
import { AuthModuleOptions } from './auth.module';
import { JwtPayload, JwtToken } from './strategy/jwt/jwt.dto';
import { AuthorizationError } from './errors';
import { AUTH_MODULE_OPTIONS } from './auth.constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
    private jwtService: JwtService
  ) {}

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
    let accessToken = await this.jwtService.signAsync(payload);
    let refreshToken = await this.jwtService.signAsync({ ...payload, refresh: true });

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
      expires_in: this.authModuleOptions.jwt?.expiresIn
    };
  }

  async logout(user: AuthUser): Promise<{ result: boolean }> {
    try {
      let result = await this.authModuleOptions.userDetailsService.onLogout(user);
      return { result };
    } catch (e) {
      this.logger.warn(e);
      throw new AuthorizationError('Unauthorized', 401);
    }
  }

  async register(data: any, source: AuthSource = AuthSource.Local): Promise<AuthUser | null> {
    if (this.authModuleOptions.registration === false) {
      throw new AuthorizationError('Registration is not supported');
    }
    return await this.authModuleOptions.userDetailsService.register(data, source);
  }

  async identifierAvailable(field: string, value: string): Promise<{ result: boolean }> {
    if (!field || !value) {
      throw new AuthorizationError('Missing required query parameters "field" and/or "value');
    }
    let result = await this.authModuleOptions.userDetailsService.identifierAvailable(field, value);
    return { result };
  }
}
