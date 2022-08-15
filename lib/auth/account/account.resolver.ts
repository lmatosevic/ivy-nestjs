import { Inject, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RequestUtil } from '../../utils';
import { StatusResponse } from '../../resource';
import { ReCaptcha } from '../decorators';
import { AuthUser } from '../interfaces';
import { AccountService } from './account.service';
import { AccountModuleOptions } from './account.module';
import { ACCOUNT_MODULE_OPTIONS } from './account.constants';

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
  }

  return AccountResolver;
}
