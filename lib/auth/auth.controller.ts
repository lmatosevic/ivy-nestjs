import { Body, Controller, Get, HttpCode, Inject, Post, Query, Type, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { LocalAuthGuard } from './strategy/local/local-auth.guard';
import { Authorized, CurrentUser, Public, ReCaptcha } from './decorators';
import { ReflectionUtil, RequestUtil } from '../utils';
import { ErrorResponse, StatusResponse } from '../resource';
import { AuthUser } from './interfaces';
import { AuthService } from './auth.service';
import { JwtToken } from './strategy/jwt/jwt.dto';
import { AuthModuleOptions, AuthRouteOptions } from './auth.module';
import { AUTH_MODULE_OPTIONS } from './auth.constants';
import { AuthType } from '../enums';

export function AuthController<T extends Type<unknown>>(authUserRef: T, registerUserRef: T): any {
  class LoginBody {
    @ApiProperty()
    username: string;

    @ApiProperty()
    password: string;
  }

  @ApiTags('Auth')
  @Controller('auth')
  class AuthController {
    constructor(
      @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
      private configService: ConfigService,
      private authService: AuthService
    ) {
      const route = authModuleOptions.route ?? configService.get('auth.route');
      const registration =
        authModuleOptions.registration ?? configService.get<AuthRouteOptions>('auth.registration');
      const login = authModuleOptions.login ?? configService.get<AuthRouteOptions>('auth.login');
      const identifierAvailable =
        authModuleOptions.identifierAvailable ??
        configService.get<AuthRouteOptions>('auth.identifierAvailable');

      if (route) {
        Reflect.defineMetadata('path', route, AuthController);
      }

      ReflectionUtil.updateAuthRoutes(AuthController.prototype, { registration, login, identifierAvailable });
    }

    @Public()
    @ReCaptcha()
    @UseGuards(LocalAuthGuard)
    @ApiBody({ type: () => LoginBody })
    @ApiBadRequestResponse({ description: 'Invalid credentials', type: ErrorResponse })
    @HttpCode(200)
    @Post('login')
    login(@CurrentUser() user: AuthUser): Promise<JwtToken> {
      return this.authService.login(user);
    }

    @ReCaptcha()
    @ApiBody({ type: () => registerUserRef })
    @ApiCreatedResponse({ type: () => authUserRef, status: 201 })
    @ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponse })
    @HttpCode(201)
    @Post('registration')
    async registration(@Body() data): Promise<AuthUser> {
      const instance = await RequestUtil.deserializeAndValidate(registerUserRef, data);
      return await this.authService.register(instance);
    }

    @ReCaptcha()
    @ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponse })
    @HttpCode(200)
    @Get('identifier/available')
    async identifierAvailable(
      @Query('field') field: string,
      @Query('value') value: string
    ): Promise<StatusResponse> {
      return await this.authService.identifierAvailable(field, value);
    }

    @Authorized(AuthType.Jwt, AuthType.OAuth2)
    @HttpCode(200)
    @Post('refresh')
    refresh(@CurrentUser() user: AuthUser): Promise<JwtToken> {
      return this.authService.login(user);
    }

    @Authorized()
    @ApiOkResponse({ type: () => StatusResponse })
    @HttpCode(200)
    @Post('logout')
    logout(@CurrentUser() user: AuthUser): Promise<StatusResponse> {
      return this.authService.logout(user);
    }

    @Authorized()
    @ApiOkResponse({ type: () => authUserRef })
    @Get('user')
    authUser(@CurrentUser() user: AuthUser): AuthUser {
      return user;
    }
  }

  return AuthController;
}
