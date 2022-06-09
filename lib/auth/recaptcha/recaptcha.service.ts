import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DeliveryMethod } from '../../enums';
import { AuthModuleOptions, AuthorizationError } from '../../auth';
import { AUTH_MODULE_OPTIONS } from '../auth.constants';

@Injectable()
export class RecaptchaService {
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
    this.recaptchaSecret =
      authModuleOptions.recaptcha?.siteSecret || configService.get('auth.recaptcha.siteSecret');
    this.deliveryMethods = {
      Header:
        authModuleOptions.recaptcha?.deliveryHeader ||
        configService.get('auth.recaptcha.deliveryHeader') ||
        'X-RECAPTCHA-TOKEN',
      Query:
        authModuleOptions.recaptcha?.deliveryQuery ||
        configService.get('auth.recaptcha.deliveryQuery') ||
        'recaptcha_token',
      Body:
        authModuleOptions.recaptcha?.deliveryBody ||
        configService.get('auth.recaptcha.deliveryBody') ||
        'recaptchaToken'
    };
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
          token = request.headers[this.deliveryMethods['header']];
          break;
        case DeliveryMethod.Query:
          token = request.query[this.deliveryMethods['query']];
          break;
        case DeliveryMethod.Body:
          token = request.body[this.deliveryMethods['body']];
          break;
        default:
          continue;
      }

      if (token) {
        return await this.verifyToken(token);
      }
    }

    throw new AuthorizationError(
      'ReCaptcha token not submitted in any of delivery methods: "' + methods.join(',') + '"',
      400
    );
  }
}
