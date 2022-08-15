import { Body, Controller, Get, HttpCode, Inject, Post, Query, Type } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { RequestUtil } from '../../utils';
import { ErrorResponse, StatusResponse } from '../../resource';
import { ReCaptcha } from '../decorators';
import { AuthUser } from '../interfaces';
import { AccountService } from './account.service';
import { AccountModuleOptions } from './account.module';
import { ACCOUNT_MODULE_OPTIONS } from './account.constants';

export function AccountController<T extends Type<unknown>>(accountRef: T, registerAccountRef: T): any {
  @ApiTags('Account')
  @Controller('account')
  class AccountController {
    constructor(
      @Inject(ACCOUNT_MODULE_OPTIONS) private accountModuleOptions: AccountModuleOptions,
      private configService: ConfigService,
      private accountService: AccountService
    ) {
      const route = accountModuleOptions.route ?? configService.get('account.route');
      if (route) {
        Reflect.defineMetadata('path', route, AccountController);
      }
      accountService.updateAccountRoutes(AccountController.prototype);
    }

    @ReCaptcha()
    @ApiBody({ type: () => registerAccountRef })
    @ApiCreatedResponse({ type: () => accountRef, status: 201 })
    @ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponse })
    @HttpCode(201)
    @Post('registration')
    async registration(@Body() data): Promise<AuthUser> {
      const instance = await RequestUtil.deserializeAndValidate(registerAccountRef, data);
      return await this.accountService.register(instance);
    }

    @ReCaptcha()
    @ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponse })
    @HttpCode(200)
    @Get('identifier/available')
    async identifierAvailable(
      @Query('field') field: string,
      @Query('value') value: string
    ): Promise<StatusResponse> {
      return await this.accountService.identifierAvailable(field, value);
    }
  }

  return AccountController;
}
