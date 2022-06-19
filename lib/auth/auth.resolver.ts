import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Inject, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Authorized, CurrentUser, ReCaptcha } from './decorators';
import { RequestUtil } from '../utils';
import { StatusResponse } from '../resource';
import { AuthSource, AuthType } from '../enums';
import { JwtToken } from './strategy/jwt/jwt.dto';
import { AuthService } from './auth.service';
import { AuthUser } from './interfaces';
import { AuthorizationError } from './errors';
import { AUTH_MODULE_OPTIONS } from '../auth/auth.constants';
import { AuthModuleOptions } from '../auth/auth.module';

export function AuthResolver<T extends Type<unknown>>(authUserRef: T, registerUserRef: T): any {
  @Resolver()
  class AuthResolver {
    constructor(
      @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
      private configService: ConfigService,
      private authService: AuthService
    ) {
      const registration = authModuleOptions.registration ?? configService.get('auth.registration');
      const login = authModuleOptions.login ?? configService.get('auth.login');

      if (registration === false) {
        const descriptor = Object.getOwnPropertyDescriptor(AuthResolver.prototype, 'registration');
        Reflect.deleteMetadata('graphql:resolver_type', descriptor.value);
      }
      if (login === false) {
        const descriptor = Object.getOwnPropertyDescriptor(AuthResolver.prototype, 'login');
        Reflect.deleteMetadata('graphql:resolver_type', descriptor.value);
      }
    }

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
