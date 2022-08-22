import { CanActivate, ExecutionContext, Inject, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, isObservable } from 'rxjs';
import { ContextUtil } from '../utils';
import { AuthType } from '../enums';
import { AuthModuleOptions } from './auth.module';
import { BasicAuthGuard } from './strategy/basic';
import { JwtAuthGuard } from './strategy/jwt';
import { ApikeyAuthGuard } from './strategy/apikey';
import { OAuth2AuthGuard } from './strategy/oauth2';
import { AuthorizationError } from './errors';
import { AUTH_KEY, HAS_AUTH_KEY, IS_PUBLIC_KEY } from './decorators';
import { AUTH_MODULE_OPTIONS } from './auth.constants';

@Injectable()
export class AuthMultiGuard implements CanActivate {
  constructor(
    @Optional() @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
    private configService: ConfigService,
    private reflector: Reflector,
    @Optional() private basicGuard: BasicAuthGuard,
    @Optional() private jwtGuard: JwtAuthGuard,
    @Optional() private apikeyGuard: ApikeyAuthGuard,
    @Optional() private oauth2Guard: OAuth2AuthGuard
  ) {}

  getRequest(context: ExecutionContext) {
    const ctx = ContextUtil.normalizeContext(context);
    return ctx.switchToHttp().getRequest();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    const isAuth = this.reflector.getAllAndOverride<boolean>(HAS_AUTH_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    // If both Public and Authorized decorators are present, first try to resolve AuthUser object, but if
    // unsuccessful then allow unauthorized user access anyway.
    if (isPublic && !isAuth) {
      return true;
    }

    const authTypes = this.reflector.getAllAndOverride<AuthType[]>(AUTH_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!this.authModuleOptions) {
      return true;
    }

    const enabledAuthTypes = authTypes.filter((t) => {
      return this.authModuleOptions[t.toLowerCase()]?.enabled === undefined
        ? this.configService.get(`auth.${t.toLowerCase()}.enabled`)
        : this.authModuleOptions[t.toLowerCase()]?.enabled;
    });

    if (enabledAuthTypes.length === 0) {
      return true;
    }

    for (const type of enabledAuthTypes) {
      switch (type) {
        case AuthType.Basic:
          if (await this.checkGuardActivation(this.basicGuard, context)) {
            return true;
          }
          break;
        case AuthType.Jwt:
          if (await this.checkGuardActivation(this.jwtGuard, context)) {
            return true;
          }
          break;
        case AuthType.OAuth2:
          if (await this.checkGuardActivation(this.oauth2Guard, context)) {
            return true;
          }
          break;
        case AuthType.ApiKey:
          if (await this.checkGuardActivation(this.apikeyGuard, context)) {
            return true;
          }
          break;
      }
    }

    // Allow unauthorized user to access endpoint
    if (isPublic) {
      return true;
    }

    throw new AuthorizationError('Unauthorized', 401);
  }

  private async checkGuardActivation(guard: CanActivate, context: ExecutionContext): Promise<boolean> {
    try {
      const call = guard.canActivate(context);
      if (isObservable(call)) {
        return await firstValueFrom(call);
      } else {
        return await call;
      }
    } catch (e) {
      return false;
    }
  }
}
