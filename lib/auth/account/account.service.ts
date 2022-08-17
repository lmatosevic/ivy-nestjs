import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthSource, VerificationType } from '../../enums';
import { ReflectionUtil } from '../../utils';
import { StatusResponse } from '../../resource';
import { MailContent, MailService } from '../../mail';
import { AccountError, AuthorizationError } from '../errors';
import { AuthUser } from '../interfaces';
import { AccountModuleOptions, AccountRouteOptions } from './account.module';
import { AccountDetailsService } from './interfaces';
import { VerificationService } from './verification';
import { ACCOUNT_MODULE_OPTIONS } from './account.constants';

@Injectable()
export class AccountService {
  private readonly accountDetailsService: AccountDetailsService<AuthUser>;
  private readonly appName: string;

  constructor(
    @Inject(ACCOUNT_MODULE_OPTIONS) private accountModuleOptions: AccountModuleOptions,
    private configService: ConfigService,
    @Optional() private mailService: MailService,
    @Optional() private verificationService: VerificationService
  ) {
    this.accountDetailsService = this.accountModuleOptions
      .accountDetailsService as AccountDetailsService<AuthUser>;
    this.appName = this.configService.get('app.name');
  }

  updateAccountRoutes(prototype: any): void {
    const verificationEnabled = this.configValue<boolean>('enabled', 'verification');

    for (const routeName of [
      'registration',
      'identifierAvailable',
      'sendVerifyEmail',
      'verifyEmail',
      'sendResetPassword',
      'resetPassword'
    ]) {
      const routeConfig = this.configValue<AccountRouteOptions>(routeName);
      if (
        this.accountModuleOptions.enabled === false ||
        (verificationEnabled === false && !['registration', 'identifierAvailable'].includes(routeName))
      ) {
        routeConfig.enabled = false;
      }
      ReflectionUtil.updateAuthRoutes(prototype, { [routeName]: routeConfig });

      if (['verifyEmail', 'resetPassword'].includes(routeName)) {
        ReflectionUtil.updateAuthRoutes(prototype, { [`${routeName}Get`]: routeConfig });
      }
    }
  }

  async register(data: any, source: AuthSource = AuthSource.Local): Promise<AuthUser | null> {
    const registration = this.configValue<AccountRouteOptions>('registration');
    const sendVerifyEmail = this.configValue<boolean>('sendVerifyEmail', 'registration');

    if (registration.enabled === false) {
      throw new AccountError('Registration is not supported');
    }

    const user = await this.accountDetailsService.registerUser(data, source);

    if (sendVerifyEmail && this.mailService) {
      await this.sendVerifyEmail(user);
    }

    return user;
  }

  async identifierAvailable(field: string, value: string): Promise<StatusResponse> {
    if (!field || !value) {
      throw new AccountError('Missing required query parameters "field" and/or "value');
    }

    const success = await this.accountDetailsService.identifierAvailable(field, value);
    return { success, message: `Requested value for "${field}" is ${success ? 'available' : 'unavailable'}` };
  }

  async sendVerifyEmail(user: AuthUser): Promise<StatusResponse> {
    if (!this.verificationService || !this.mailService) {
      throw new AccountError('Email verification sending is not supported');
    }

    if (!user) {
      throw new AuthorizationError('Unauthorized user');
    }

    if (user.verified) {
      return { success: false, message: 'Account is already verified' };
    }

    const { subject, mailContent } = await this.prepareEmailData(
      'sendVerifyEmail',
      VerificationType.Email,
      user.getId(),
      `[${this.appName}] Verify your email address`,
      'Please verify your email address by visiting following link: {{link}}'
    );

    const result = await this.mailService.send(user.getEmail(), subject, mailContent);

    return {
      success: result,
      message: result ? 'Verification email sent' : 'Sending verification email failed'
    };
  }

  async verifyEmail(token: string): Promise<StatusResponse> {
    if (!this.verificationService) {
      throw new AccountError('Email verification is not supported');
    }

    const { verificationToken, error } = await this.verificationService.findAndValidateToken(
      token,
      VerificationType.Email
    );

    if (error) {
      return {
        success: false,
        message: error
      };
    }

    const result = await this.accountDetailsService.verifyAccount(verificationToken.accountId);

    return { success: result, message: result ? 'Email verified' : 'Email verification failed' };
  }

  async sendResetPassword(email: string): Promise<StatusResponse> {
    if (!this.verificationService || !this.mailService) {
      throw new AccountError('Password reset sending is not supported');
    }

    const user = await this.accountDetailsService.findByUsername(email);

    if (!user) {
      return {
        success: false,
        message: 'Account does not exists'
      };
    }

    const { subject, mailContent } = await this.prepareEmailData(
      'sendResetPassword',
      VerificationType.Password,
      user.getId(),
      `[${this.appName}] Reset your password`,
      'Reset your password by visiting following secure link: {{link}}'
    );

    const result = await this.mailService.send(user.getEmail(), subject, mailContent);

    return {
      success: result,
      message: result ? 'Reset password email sent' : 'Sending password reset email failed'
    };
  }

  async resetPassword(token: string, password: string): Promise<StatusResponse> {
    if (!this.verificationService) {
      throw new AccountError('Password reset is not supported');
    }

    const { verificationToken, error } = await this.verificationService.findAndValidateToken(
      token,
      VerificationType.Password
    );

    if (error) {
      return {
        success: false,
        message: error
      };
    }

    const result = await this.accountDetailsService.updatePassword(verificationToken.accountId, password);

    return { success: result, message: result ? 'Pasword updated' : 'Password update failed' };
  }

  private async prepareEmailData(
    configKey: string,
    type: VerificationType,
    userId: string | number,
    defaultSubject: string,
    defaultEmailText: string
  ): Promise<{ subject: string; mailContent: MailContent }> {
    const expiresIn = this.configValue<number>('expiresIn', configKey);
    const linkUrl = this.configValue<string>('linkUrl', configKey);
    const subject = this.configValue<string>('subject', configKey) ?? defaultSubject;

    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const verificationToken = await this.verificationService.createToken(type, userId, expiresAt);

    const link = this.createLink(linkUrl, verificationToken.token, type);
    const content = this.accountModuleOptions.sendResetPassword?.content;

    const mailContent = this.createMailContent(content, link, defaultEmailText);

    return { subject, mailContent };
  }

  private createLink(linkUrl: string, token: string, type: VerificationType): string {
    if (!linkUrl) {
      linkUrl = this.configService.get('app.hostname') || this.configService.get('app.host');
      let route = this.accountModuleOptions.route ?? this.configService.get('account.route') ?? 'account';
      const addSlash = !linkUrl.endsWith('/') && !linkUrl.endsWith('=');
      const prefix = !route.startsWith('http') ? 'http://' : '';
      const suffix = type === VerificationType.Password ? '&password=' : '';
      route = `${route}/${type === VerificationType.Email ? 'verify-email' : 'reset-password'}`;
      linkUrl = `${prefix}${linkUrl}${addSlash ? '/' : ''}${route}?token={{token}}${suffix}`;
    }

    if (linkUrl.includes('{{token}}')) {
      return linkUrl.replace('{{token}}', token);
    }

    const addSlash = !linkUrl.endsWith('/') && !linkUrl.endsWith('=');
    return `${linkUrl}${addSlash ? '/' : ''}${token}`;
  }

  private createMailContent(content: MailContent, link: string, defaultText: string): MailContent {
    if (content && content.template) {
      if (!content.template.context) {
        content.template.context = { link };
      } else if (!content.template.context?.['link']) {
        content.template.context['link'] = link;
      }
    }
    return content ?? { text: defaultText.replace('{{link}}', link) };
  }

  private configValue<T>(name: string, prefix?: string): T {
    if (!prefix) {
      return this.accountModuleOptions[name] ?? this.configService.get(`account.${name}`);
    }
    return this.accountModuleOptions[prefix]?.[name] ?? this.configService.get(`account.${prefix}.${name}`);
  }
}
