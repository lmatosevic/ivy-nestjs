import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiTags } from '@nestjs/swagger';
import { RequestUtil } from '../../../utils';
import { ErrorResponse } from '../../../resource';
import { Public } from '../../decorators';
import { JwtToken } from '../../strategy/jwt/jwt.dto';
import { GoogleService } from './google.service';
import { GoogleAuth } from './google-auth.dto';
import { AuthModuleOptions } from '../../auth.module';
import { AUTH_MODULE_OPTIONS } from '../../auth.constants';

@ApiTags('auth')
@Controller('google')
export class GoogleController {
  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
    private googleService: GoogleService
  ) {
    const currentPath = Reflect.getMetadata('path', GoogleController);
    Reflect.defineMetadata('path', `${authModuleOptions.route || 'auth'}/${currentPath}`, GoogleController);
    if (authModuleOptions.google.enabled === false) {
      const descriptor = Object.getOwnPropertyDescriptor(GoogleController.prototype, 'authorize');
      Reflect.deleteMetadata('path', descriptor.value);
    }
  }

  @Public()
  @ApiBody({ type: () => GoogleAuth })
  @ApiBadRequestResponse({ description: 'Invalid credentials', type: ErrorResponse })
  @HttpCode(200)
  @Post('authorize')
  async authorize(@Body() data): Promise<JwtToken> {
    const instance = await RequestUtil.deserializeAndValidate(GoogleAuth, data);
    return await this.googleService.authorize(instance);
  }
}
