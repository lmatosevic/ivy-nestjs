import { Controller, Get, HttpCode, Inject, Post, Type, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { LocalAuthGuard } from './strategy/local/local-auth.guard';
import { Authorized, CurrentUser, Public, ReCaptcha } from './decorators';
import { ErrorResponse, StatusResponse } from '../resource';
import { AuthType } from '../enums';
import { AuthUser } from './interfaces';
import { AuthService } from './auth.service';
import { JwtToken } from './strategy/jwt/jwt.dto';
import { AuthModuleOptions } from './auth.module';
import { AUTH_MODULE_OPTIONS } from './auth.constants';

export function AuthController<T extends Type<unknown>>(authUserRef: T): any {
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
      if (route) {
        Reflect.defineMetadata('path', route, AuthController);
      }
      authService.updateAuthRoutes(AuthController.prototype);
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
