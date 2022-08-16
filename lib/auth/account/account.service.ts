import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthSource } from '../../enums';
import { ReflectionUtil } from '../../utils';
import { StatusResponse } from '../../resource';
import { MailService } from '../../mail';
import { AuthUser } from '../interfaces';
import { AuthorizationError } from '../errors';
import { AccountModuleOptions, AccountRouteOptions } from './account.module';
import { ACCOUNT_MODULE_OPTIONS } from './account.constants';
import { AccountDetailsService } from './interfaces';

@Injectable()
export class AccountService {
  private readonly accountDetailsService: AccountDetailsService<AuthUser>;

  constructor(
    @Inject(ACCOUNT_MODULE_OPTIONS) private accountModuleOptions: AccountModuleOptions,
    private configService: ConfigService,
    @Optional() private mailService: MailService
  ) {
    this.accountDetailsService = this.accountModuleOptions
      .accountDetailsService as AccountDetailsService<AuthUser>;
  }

  updateAccountRoutes(prototype: any): void {
    for (const routeName of [
      'registration',
      'identifierAvailable',
      'sendVerifyEmail',
      'verifyEmail',
      'sendResetPassword',
      'resetPassword'
    ]) {
      const routeConfig = this.configValue<AccountRouteOptions>(routeName);
      if (this.accountModuleOptions.enabled === false) {
        routeConfig.enabled = false;
      }
      ReflectionUtil.updateAuthRoutes(prototype, { [routeName]: routeConfig });
    }
  }

  async register(data: any, source: AuthSource = AuthSource.Local): Promise<AuthUser | null> {
    const registration = this.configValue<AccountRouteOptions>('registration');
    const sendVerifyEmail =
      this.accountModuleOptions.registration?.sendVerifyEmail ??
      this.configService.get<AccountRouteOptions>('account.registration.sendVerifyEmail');

    if (registration.enabled === false) {
      throw new AuthorizationError('Registration is not supported');
    }

    const user = await this.accountDetailsService.registerUser(data, source);

    if (sendVerifyEmail && this.mailService) {
      await this.sendVerifyEmail(user);
    }

    return user;
  }

  async identifierAvailable(field: string, value: string): Promise<StatusResponse> {
    if (!field || !value) {
      throw new AuthorizationError('Missing required query parameters "field" and/or "value');
    }
    const success = await this.accountDetailsService.identifierAvailable(field, value);
    return { success, message: `Requested value for "${field}" is ${success ? 'available' : 'unavailable'}` };
  }

  async sendVerifyEmail(user: AuthUser): Promise<StatusResponse> {
    const result = await this.mailService.send(user.getEmail(), 'Verify email', {
      text: 'Please verify your email by visiting following link: ${link}'
    });
    return {
      success: result,
      message: result ? 'Verification email sent' : 'Sending verification email failed'
    };
  }

  async verifyEmail(token: string): Promise<StatusResponse> {
    return { success: true, message: 'Email verified' };
  }

  async sendResetPassword(email: string): Promise<StatusResponse> {
    const user = await this.accountDetailsService.findByUsername(email);

    if (!user) {
      return {
        success: false,
        message: 'User does not exists'
      };
    }

    const result = await this.mailService.send(user.getEmail(), 'Verify email', {
      text: 'Please verify your email by visiting following link: ${link}'
    });
    return {
      success: result,
      message: result ? 'Reset password email sent' : 'Sending password reset email failed'
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<StatusResponse> {
    return { success: true, message: 'Pasword updated' };
  }

  private configValue<T>(name: string): T {
    return this.accountModuleOptions[name] ?? this.configService.get(`account.${name}`);
  }
}
