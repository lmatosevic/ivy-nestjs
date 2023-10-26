import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DeliveryMethod } from '../../enums';
import { AuthModuleOptions, AuthorizationError } from '../../auth';
import { AUTH_MODULE_OPTIONS } from '../auth.constants';

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly checkTokenUri = 'https://www.google.com/recaptcha/api/siteverify';
  private readonly recaptchaSecret: string;
  private readonly enabled: boolean;
  private readonly deliveryMethods: Record<DeliveryMethod, string>;

  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
    private configService: ConfigService,
    private httpService: HttpService
  ) {
    this.enabled =
      authModuleOptions.recaptcha?.enabled === undefined
        ? configService.get('auth.recaptcha.enabled')
        : authModuleOptions.recaptcha?.enabled;
    this.recaptchaSecret = authModuleOptions.recaptcha?.siteSecret || configService.get('auth.recaptcha.siteSecret');
    this.deliveryMethods = {
      [DeliveryMethod.Header]:
        authModuleOptions.recaptcha?.deliveryHeader ||
        configService.get('auth.recaptcha.deliveryHeader') ||
        'X-RECAPTCHA-TOKEN',
      [DeliveryMethod.Query]:
        authModuleOptions.recaptcha?.deliveryQuery ||
        configService.get('auth.recaptcha.deliveryQuery') ||
        'recaptcha_token',
      [DeliveryMethod.Body]:
        authModuleOptions.recaptcha?.deliveryBody ||
        configService.get('auth.recaptcha.deliveryBody') ||
        'recaptchaToken'
    };

    if (this.enabled && !this.recaptchaSecret) {
      this.logger.warn('ReCaptcha site secret is not configured');
    }
  }

  async verifyToken(token: string): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.checkTokenUri, {
          params: {
            secret: this.recaptchaSecret,
            response: token
          }
        })
      );
      return response.data?.success;
    } catch (e) {
      this.logger.debug(e);
      throw new AuthorizationError('Error verifying reCaptcha token', 500);
    }
  }

  async verifyTokenFromRequest(request: any, methods: DeliveryMethod[]): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    for (const method of methods) {
      let token;
      switch (method) {
        case DeliveryMethod.Header:
          token = request.headers[this.deliveryMethods[DeliveryMethod.Header].toLowerCase()];
          break;
        case DeliveryMethod.Query:
          token = request.query[this.deliveryMethods[DeliveryMethod.Query]];
          break;
        case DeliveryMethod.Body:
          token = request.body[this.deliveryMethods[DeliveryMethod.Body]];
          break;
        default:
          continue;
      }

      if (token) {
        return await this.verifyToken(token);
      }
    }

    throw new AuthorizationError(
      'ReCaptcha token is not submitted in any of valid delivery methods: ' +
        Object.entries(this.deliveryMethods)
          .map(([key, val]) => `${key}(${val})`)
          .join(', '),
      400
    );
  }
}
