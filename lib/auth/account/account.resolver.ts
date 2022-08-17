import { Inject, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RequestUtil } from '../../utils';
import { StatusResponse } from '../../resource';
import { Authorized, CurrentUser, ReCaptcha } from '../decorators';
import { AuthUser } from '../interfaces';
import { AccountService } from './account.service';
import { AccountModuleOptions } from './account.module';
import { ACCOUNT_MODULE_OPTIONS } from './account.constants';
import { ResetPasswordDto, SendResetPasswordDto, VerifyEmailDto } from './dto';

export function AccountResolver<T extends Type<unknown>>(accountRef: T, registerAccountRef: T): any {
  @Resolver()
  class AccountResolver {
    constructor(
      @Inject(ACCOUNT_MODULE_OPTIONS) private accountModuleOptions: AccountModuleOptions,
      private configService: ConfigService,
      private accountService: AccountService
    ) {
      accountService.updateAccountRoutes(AccountResolver.prototype);
    }

    @ReCaptcha()
    @Mutation(() => accountRef)
    async registration(@Args('data', { type: () => registerAccountRef }) data: any): Promise<AuthUser> {
      const instance = await RequestUtil.deserializeAndValidate(registerAccountRef, data);
      return await this.accountService.register(instance);
    }

    @ReCaptcha()
    @Query(() => StatusResponse)
    async identifierAvailable(
      @Args('field', { type: () => String }) field: string,
      @Args('value', { type: () => String }) value: string
    ): Promise<StatusResponse> {
      return await this.accountService.identifierAvailable(field, value);
    }

    @Authorized()
    @ReCaptcha()
    @Mutation(() => StatusResponse)
    async sendVerifyEmail(@CurrentUser() user: AuthUser): Promise<StatusResponse> {
      return await this.accountService.sendVerifyEmail(user);
    }

    @ReCaptcha()
    @Mutation(() => StatusResponse)
    async verifyEmail(
      @Args('data', { type: () => VerifyEmailDto }) data: VerifyEmailDto
    ): Promise<StatusResponse> {
      return await this.accountService.verifyEmail(data.token);
    }

    @ReCaptcha()
    @Mutation(() => StatusResponse)
    async sendResetPassword(
      @Args('data', { type: () => SendResetPasswordDto }) data: SendResetPasswordDto
    ): Promise<StatusResponse> {
      return await this.accountService.sendResetPassword(data.email);
    }

    @ReCaptcha()
    @Mutation(() => StatusResponse)
    async resetPassword(
      @Args('data', { type: () => ResetPasswordDto }) data: ResetPasswordDto
    ): Promise<StatusResponse> {
      return await this.accountService.resetPassword(data.token, data.password);
    }
  }

  return AccountResolver;
}
