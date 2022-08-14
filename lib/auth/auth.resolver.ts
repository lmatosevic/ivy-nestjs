import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Inject, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Authorized, CurrentUser, ReCaptcha, RECAPTCHA_KEY } from './decorators';
import { ReflectionUtil, RequestUtil } from '../utils';
import { StatusResponse } from '../resource';
import { AuthSource, AuthType } from '../enums';
import { JwtToken } from './strategy/jwt/jwt.dto';
import { AuthService } from './auth.service';
import { AuthUser } from './interfaces';
import { AuthorizationError } from './errors';
import { AUTH_MODULE_OPTIONS } from '../auth/auth.constants';
import { AuthModuleOptions, AuthRouteOptions } from '../auth/auth.module';

export function AuthResolver<T extends Type<unknown>>(authUserRef: T, registerUserRef: T): any {
  @Resolver()
  class AuthResolver {
    constructor(
      @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
      private configService: ConfigService,
      private authService: AuthService
    ) {
      const registration =
        authModuleOptions.registration ?? configService.get<AuthRouteOptions>('auth.registration');
      const login = authModuleOptions.login ?? configService.get<AuthRouteOptions>('auth.login');
      const identifierAvailable =
        authModuleOptions.identifierAvailable ??
        configService.get<AuthRouteOptions>('auth.identifierAvailable');

      if (registration.enabled === false) {
        ReflectionUtil.deleteResourceOperation(AuthResolver.prototype, 'registration');
      }
      if (registration.recaptcha === false) {
        ReflectionUtil.deleteMetadata(AuthResolver.prototype, 'registration', RECAPTCHA_KEY);
      }
      if (login.enabled === false) {
        ReflectionUtil.deleteResourceOperation(AuthResolver.prototype, 'login');
      }
      if (login.recaptcha === false) {
        ReflectionUtil.deleteMetadata(AuthResolver.prototype, 'login', RECAPTCHA_KEY);
      }
      if (identifierAvailable.enabled === false) {
        ReflectionUtil.deleteResourceOperation(AuthResolver.prototype, 'identifierAvailable');
      }
      if (identifierAvailable.recaptcha === false) {
        ReflectionUtil.deleteMetadata(AuthResolver.prototype, 'identifierAvailable', RECAPTCHA_KEY);
      }
    }

    @ReCaptcha()
    @Mutation(() => JwtToken)
    async login(
      @Args('username', { type: () => String }) username: string,
      @Args('password', { type: () => String }) password: string
    ): Promise<JwtToken> {
      const user = await this.authService.validateUser(username, password);
      if (!user) {
        throw new AuthorizationError('Invalid credentials');
      }
      if (user.authSource !== AuthSource.Local) {
        throw new AuthorizationError('User account is not from local source', 403);
      }
      return this.authService.login(user);
    }

    @ReCaptcha()
    @Mutation(() => authUserRef)
    async registration(@Args('data', { type: () => registerUserRef }) data: any): Promise<AuthUser> {
      const instance = await RequestUtil.deserializeAndValidate(registerUserRef, data);
      return await this.authService.register(instance);
    }

    @ReCaptcha()
    @Query(() => StatusResponse)
    async identifierAvailable(
      @Args('field', { type: () => String }) field: string,
      @Args('value', { type: () => String }) value: string
    ): Promise<StatusResponse> {
      return await this.authService.identifierAvailable(field, value);
    }

    @Authorized(AuthType.Jwt, AuthType.OAuth2)
    @Mutation(() => JwtToken)
    async refresh(@CurrentUser() user: AuthUser): Promise<JwtToken> {
      return await this.authService.login(user);
    }

    @Authorized()
    @Mutation(() => StatusResponse)
    async logout(@CurrentUser() user: AuthUser): Promise<StatusResponse> {
      return await this.authService.logout(user);
    }

    @Authorized()
    @Query(() => authUserRef)
    async authUser(@CurrentUser() user: AuthUser): Promise<AuthUser> {
      return user;
    }
  }

  return AuthResolver;
}
