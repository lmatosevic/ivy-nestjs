import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  Request,
  Type,
  UseGuards
} from '@nestjs/common';
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
import { Authorized, Public, ReCaptcha } from './decorators';
import { RequestUtil } from '../utils';
import { ErrorResponse } from '../resource';
import { AuthUser } from './interfaces';
import { AuthService } from './auth.service';
import { JwtToken } from './strategy/jwt/jwt.dto';
import { AuthModuleOptions } from './auth.module';
import { AUTH_MODULE_OPTIONS } from './auth.constants';
import { AuthType } from '../enums';

export function AuthController<T extends Type<unknown>>(authUserRef: T, registerUserRef: T): any {
  class SuccessResponse {
    @ApiProperty()
    result: boolean;
  }

  class LoginBody {
    @ApiProperty()
    username: string;

    @ApiProperty()
    password: string;
  }

  @ApiTags('auth')
  @Controller('auth')
  class AuthController {
    constructor(
      @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
      private configService: ConfigService,
      private authService: AuthService
    ) {
      const route = authModuleOptions.route ?? configService.get('auth.route');
      const registration = authModuleOptions.registration ?? configService.get('auth.registration');
      const login = authModuleOptions.login ?? configService.get('auth.login');

      if (route) {
        Reflect.defineMetadata('path', route, AuthController);
      }
      if (registration === false) {
        const descriptor = Object.getOwnPropertyDescriptor(AuthController.prototype, 'registration');
        Reflect.deleteMetadata('path', descriptor.value);
      }
      if (login === false) {
        const descriptor = Object.getOwnPropertyDescriptor(AuthController.prototype, 'login');
        Reflect.deleteMetadata('path', descriptor.value);
      }
    }

    @Public()
    @UseGuards(LocalAuthGuard)
    @ApiBody({ type: () => LoginBody })
    @ApiBadRequestResponse({ description: 'Invalid credentials', type: ErrorResponse })
    @HttpCode(200)
    @Post('login')
    login(@Request() req): Promise<JwtToken> {
      return this.authService.login(req.user);
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
    ): Promise<SuccessResponse> {
      return await this.authService.identifierAvailable(field, value);
    }

    @Authorized(AuthType.Jwt, AuthType.OAuth2)
    @HttpCode(200)
    @Post('refresh')
    refresh(@Request() req): Promise<JwtToken> {
      return this.authService.login(req.user);
    }

    @Authorized()
    @ApiOkResponse({ type: () => SuccessResponse })
    @HttpCode(200)
    @Post('logout')
    logout(@Request() req): Promise<SuccessResponse> {
      return this.authService.logout(req.user);
    }

    @Authorized()
    @ApiOkResponse({ type: () => authUserRef })
    @Get('user')
    authUser(@Request() req): AuthUser {
      return req.user;
    }
  }

  return AuthController;
}
