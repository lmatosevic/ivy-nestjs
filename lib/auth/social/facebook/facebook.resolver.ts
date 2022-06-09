import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../decorators';
import { JwtToken } from '../../strategy/jwt/jwt.dto';
import { FacebookService } from './facebook.service';
import { FacebookAuth } from './facebook-auth.dto';
import { RequestUtil } from '../../../utils';
import { AuthModuleOptions } from '../../auth.module';
import { AUTH_MODULE_OPTIONS } from '../../auth.constants';

@Resolver()
export class FacebookResolver {
  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
    private configService: ConfigService,
    private facebookService: FacebookService
  ) {
    const enabled =
      authModuleOptions.facebook?.enabled === undefined
        ? configService.get('auth.facebook.enabled')
        : authModuleOptions.facebook?.enabled;

    if (enabled === false) {
      const descriptor = Object.getOwnPropertyDescriptor(FacebookResolver.prototype, 'authorizeFacebook');
      Reflect.deleteMetadata('graphql:resolver_type', descriptor.value);
    }
  }

  @Public()
  @Mutation(() => JwtToken)
  async authorizeFacebook(@Args('data', { type: () => FacebookAuth }) data: any): Promise<JwtToken> {
    const instance = await RequestUtil.deserializeAndValidate(FacebookAuth, data);
    return await this.facebookService.authorize(instance);
  }
}
