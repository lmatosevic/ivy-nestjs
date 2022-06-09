import { DynamicModule, Global, Module, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { AuthUser, UserDetailsService } from './interfaces';
import { AuthController } from './auth.controller';
import { LocalAuthGuard, LocalStrategy } from './strategy/local';
import { BasicAuthGuard, BasicStrategy } from './strategy/basic';
import { JwtAuthGuard, JwtStrategy } from './strategy/jwt';
import { ApikeyAuthGuard, ApikeyStrategy } from './strategy/apikey';
import { OAuth2AuthGuard, OAuth2Strategy } from './strategy/oauth2';
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
  userDetailsService: UserDetailsService<AuthUser>;
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

export interface AuthModuleAsyncOptions
  extends ModuleAsyncOptions<Omit<AuthModuleOptions, 'userDetailsClass' | 'userRegisterDtoClass'>> {
  userDetailsClass: Type;
  userRegisterDtoClass: Type;
}

@Global()
@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleOptions): DynamicModule {
    return this.createModule(options, [
      {
        provide: AUTH_MODULE_OPTIONS,
        useValue: options
      }
    ]);
  }

  static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, AUTH_MODULE_OPTIONS);
    return this.createModule(options, providers, imports);
  }

  private static createModule(
    options: AuthModuleOptions | AuthModuleAsyncOptions,
    providers: any[] = [],
    imports: any[] = []
  ): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        ...imports,
        JwtModule.registerAsync({
          inject: [AUTH_MODULE_OPTIONS, ConfigService],
          useFactory: async (authModuleOptions: AuthModuleOptions, conf: ConfigService) => ({
            secret: authModuleOptions.jwt?.secret ?? conf.get('auth.jwt.secret'),
            signOptions: {
              expiresIn: (authModuleOptions.jwt?.expiresIn ?? conf.get('auth.jwt.expiresIn')) + 's'
            }
          })
        }),
        PassportModule,
        HttpModule
      ],
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
