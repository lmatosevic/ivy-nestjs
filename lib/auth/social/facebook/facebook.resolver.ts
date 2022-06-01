import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
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
    private facebookService: FacebookService
  ) {
    if (authModuleOptions.facebook.enabled === false) {
      const descriptor = Object.getOwnPropertyDescriptor(FacebookResolver.prototype, 'authorizeFacebook');
      Reflect.deleteMetadata('graphql:resolver_type', descriptor.value);
    }
  }

  @Public()
  @Mutation(() => JwtToken)
  async authorizeFacebook(@Args('data', { type: () => FacebookAuth }) data: any): Promise<JwtToken> {
    let instance = await RequestUtil.deserializeAndValidate(FacebookAuth, data);
    return await this.facebookService.authorize(instance);
  }
}
