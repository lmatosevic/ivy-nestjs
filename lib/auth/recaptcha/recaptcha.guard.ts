import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DeliveryMethod } from '../../enums';
import { ContextUtil } from '../../utils';
import { AuthorizationError, RECAPTCHA_KEY } from '../../auth';
import { RecaptchaService } from './recaptcha.service';

@Injectable()
export class RecaptchaGuard implements CanActivate {
  constructor(private reflector: Reflector, private recaptchaService: RecaptchaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const deliveryMethods = this.reflector.getAllAndOverride<DeliveryMethod[]>(RECAPTCHA_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!deliveryMethods) {
      return true;
    }
    const ctx = ContextUtil.normalizeContext(context);
    const request = ctx.switchToHttp().getRequest();

    let result = await this.recaptchaService.verifyTokenFromRequest(request, deliveryMethods);

    if (!result) {
      throw new AuthorizationError('Invalid reCaptcha token submitted');
    }
    return true;
  }
}
