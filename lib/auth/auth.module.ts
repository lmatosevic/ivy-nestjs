import { DynamicModule, Global, Module, Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { UserDetailsService } from './interfaces';
import { AuthController } from './auth.controller';
import { LocalStrategy, LocalAuthGuard } from './strategy/local';
import { BasicStrategy, BasicAuthGuard } from './strategy/basic';
import { JwtStrategy, JwtAuthGuard } from './strategy/jwt';
import { ApikeyStrategy, ApikeyAuthGuard } from './strategy/apikey';
import { OAuth2Strategy, OAuth2AuthGuard } from './strategy/oauth2';
import { RecaptchaGuard, RecaptchaService } from './recaptcha';
import { RolesGuard } from './roles.guard';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import {
  FacebookController,
  FacebookResolver,
  FacebookService,
  GoogleController,
  GoogleResolver,
  GoogleService
} from './social';
import { AUTH_MODULE_OPTIONS } from './auth.constants';

export interface AuthModuleOptions {
  userDetailsService: UserDetailsService<any>;
  userDetailsClass: Type;
  userRegisterDtoClass: Type;
  route?: string;
  login?: boolean;
  registration?: boolean;
  jwt?: { secret: string; expiresIn?: number; enabled?: boolean };
  basic?: { enabled?: boolean };
  oauth2?: { enabled?: boolean };
  apikey?: { enabled?: boolean };
  recaptcha?: {
    siteSecret: string;
    deliveryHeader?: string;
    deliveryQuery?: string;
    deliveryBody?: string;
    enabled?: boolean;
  };
  google?: { clientId: string; enabled?: boolean };
  facebook?: { appId: string; appSecret: string; enabled?: boolean };
}

export interface AuthModuleAsyncOptions extends ModuleAsyncOptions<AuthModuleOptions> {
  userDetailsClass: Type;
  userRegisterDtoClass: Type;
}

@Global()
@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleOptions): DynamicModule {
    return this.createModule(
      options,
      [
        JwtModule.register({
          secret: options.jwt?.secret,
          signOptions: { expiresIn: (options.jwt?.expiresIn || 2592000) + 's' }
        })
      ],
      [
        {
          provide: AUTH_MODULE_OPTIONS,
          useValue: options
        }
      ]
    );
  }

  static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, AUTH_MODULE_OPTIONS);
    return this.createModule(
      options,
      [
        ...imports,
        JwtModule.registerAsync({
          inject: [AUTH_MODULE_OPTIONS],
          useFactory: async (authModuleOptions: AuthModuleOptions) => ({
            secret: authModuleOptions.jwt?.secret,
            signOptions: {
              expiresIn: (authModuleOptions.jwt?.expiresIn || 2592000) + 's'
            }
          })
        })
      ],
      providers
    );
  }

  private static createModule(
    options: AuthModuleOptions | AuthModuleAsyncOptions,
    imports: any[] = [],
    providers: any[] = []
  ): DynamicModule {
    return {
      module: AuthModule,
      imports: [...imports, PassportModule, HttpModule],
      providers: [
        ...providers,
        AuthService,
        LocalStrategy,
        BasicStrategy,
        JwtStrategy,
        OAuth2Strategy,
        ApikeyStrategy,
        LocalAuthGuard,
        BasicAuthGuard,
        JwtAuthGuard,
        OAuth2AuthGuard,
        ApikeyAuthGuard,
        RecaptchaService,
        GoogleService,
        FacebookService,
        GoogleResolver,
        FacebookResolver,
        {
          provide: AuthResolver.name,
          useClass: AuthResolver(options.userDetailsClass, options.userRegisterDtoClass)
        },
        {
          provide: APP_GUARD,
          useClass: RolesGuard
        },
        {
          provide: APP_GUARD,
          useClass: RecaptchaGuard
        }
      ],
      controllers: [
        AuthController(options.userDetailsClass, options.userRegisterDtoClass),
        GoogleController,
        FacebookController
      ],
      exports: [
        AUTH_MODULE_OPTIONS,
        AuthService,
        LocalAuthGuard,
        BasicAuthGuard,
        JwtAuthGuard,
        OAuth2AuthGuard,
        ApikeyAuthGuard,
        RecaptchaService,
        GoogleService,
        FacebookService
      ]
    };
  }
}
