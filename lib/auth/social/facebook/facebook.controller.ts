import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { RequestUtil } from '../../../utils';
import { ErrorResponse } from '../../../resource';
import { Public } from '../../decorators';
import { JwtToken } from '../../strategy/jwt/jwt.dto';
import { FacebookService } from './facebook.service';
import { FacebookAuth } from './facebook-auth.dto';
import { AuthModuleOptions } from '../../auth.module';
import { AUTH_MODULE_OPTIONS } from '../../auth.constants';

@ApiTags('Auth')
@Controller('facebook')
export class FacebookController {
  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
    private configService: ConfigService,
    private facebookService: FacebookService
  ) {
    const route = authModuleOptions.route ?? configService.get('auth.route');
    const enabled =
      authModuleOptions.facebook?.enabled === undefined
        ? configService.get('auth.facebook.enabled')
        : authModuleOptions.facebook?.enabled;
    const currentPath = Reflect.getMetadata('path', FacebookController);

    Reflect.defineMetadata('path', `${route || 'auth'}/${currentPath}`, FacebookController);
    if (enabled === false) {
      const descriptor = Object.getOwnPropertyDescriptor(FacebookController.prototype, 'authorize');
      Reflect.deleteMetadata('path', descriptor.value);
    }
  }

  @Public()
  @ApiBody({ type: () => FacebookAuth })
  @ApiBadRequestResponse({ description: 'Invalid credentials', type: ErrorResponse })
  @HttpCode(200)
  @Post('authorize')
  async authorize(@Body() data): Promise<JwtToken> {
    const instance = await RequestUtil.deserializeAndValidate(FacebookAuth, data);
    return await this.facebookService.authorize(instance);
  }
}
