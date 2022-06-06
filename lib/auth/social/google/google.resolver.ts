import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { RequestUtil } from '../../../utils';
import { Public } from '../../decorators';
import { GoogleAuth } from './google-auth.dto';
import { GoogleService } from './google.service';
import { JwtToken } from '../../strategy/jwt/jwt.dto';
import { AuthModuleOptions } from '../../auth.module';
import { AUTH_MODULE_OPTIONS } from '../../auth.constants';

@Resolver()
export class GoogleResolver {
  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
    private googleService: GoogleService
  ) {
    if (authModuleOptions.google.enabled === false) {
      const descriptor = Object.getOwnPropertyDescriptor(GoogleResolver.prototype, 'authorizeGoogle');
      Reflect.deleteMetadata('graphql:resolver_type', descriptor.value);
    }
  }

  @Public()
  @Mutation(() => JwtToken)
  async authorizeGoogle(@Args('data', { type: () => GoogleAuth }) data: any): Promise<JwtToken> {
    const instance = await RequestUtil.deserializeAndValidate(GoogleAuth, data);
    return await this.googleService.authorize(instance);
  }
}
