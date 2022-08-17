import { DynamicModule, Global, Module, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthUser, UserDetailsService } from '../interfaces';
import { ModuleAsyncOptions, ModuleUtil } from '../../utils';
import { MailContent, MailModule } from '../../mail';
import { VerificationModule, VerificationModuleOptions } from './verification';
import { AccountDetailsService } from './interfaces';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { AccountResolver } from './account.resolver';
import { ACCOUNT_MODULE_OPTIONS } from './account.constants';

export type AccountRouteOptions = {
  enabled?: boolean;
  recaptcha?: boolean;
};

export type EmailOptions = {
  subject?: string;
  content?: MailContent;
  expiresIn?: number;
  linkUrl?: string;
};

export interface AccountModuleOptions {
  accountDetailsService:
    | UserDetailsService<AuthUser>
    | (UserDetailsService<AuthUser> & AccountDetailsService<AuthUser>);
  accountDetailsClass: Type;
  accountRegisterDtoClass: Type;
  route?: string;
  registration?: AccountRouteOptions & { sendVerifyEmail?: boolean };
  identifierAvailable?: AccountRouteOptions;
  sendVerifyEmail?: AccountRouteOptions & EmailOptions;
  verifyEmail?: AccountRouteOptions;
  sendResetPassword?: AccountRouteOptions & EmailOptions;
  resetPassword?: AccountRouteOptions;
  verification?: Partial<VerificationModuleOptions>;
  enabled?: boolean;
}

export interface AccountModuleAsyncOptions
  extends ModuleAsyncOptions<Omit<AccountModuleOptions, 'accountDetailsClass' | 'accountRegisterDtoClass'>> {
  accountDetailsClass: Type;
  accountRegisterDtoClass: Type;
}

@Global()
@Module({})
export class AccountModule {
  static forRoot(options: AccountModuleOptions): DynamicModule {
    return this.createModule(options, [
      {
        provide: ACCOUNT_MODULE_OPTIONS,
        useValue: options
      }
    ]);
  }

  static forRootAsync(options: AccountModuleAsyncOptions): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, ACCOUNT_MODULE_OPTIONS);
    return this.createModule(options, providers, imports);
  }

  private static createModule(
    options: AccountModuleOptions | AccountModuleAsyncOptions,
    providers: any[] = [],
    imports: any[] = []
  ): DynamicModule {
    return {
      module: AccountModule,
      imports: [
        ...imports,
        VerificationModule.forRootAsync({
          inject: [ACCOUNT_MODULE_OPTIONS, ConfigService],
          useFactory: async (accountModuleOptions: AccountModuleOptions, conf: ConfigService) => ({
            enabled: conf.get('account.verification.enabled'),
            ...(accountModuleOptions.verification || {})
          })
        }),
        MailModule
      ],
      providers: [
        ...providers,
        AccountService,
        {
          provide: AccountResolver.name,
          useClass: AccountResolver(options.accountDetailsClass, options.accountRegisterDtoClass)
        }
      ],
      controllers: [AccountController(options.accountDetailsClass, options.accountRegisterDtoClass)],
      exports: [ACCOUNT_MODULE_OPTIONS, AccountService]
    };
  }
}
