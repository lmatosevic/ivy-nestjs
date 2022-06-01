import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiHeader, ApiQuery } from '@nestjs/swagger';
import { DeliveryMethod } from '../../enums';

export const RECAPTCHA_KEY = 'recaptcha';

export const ReCaptcha = (...methods: DeliveryMethod[]) => {
  let decorators = [];

  if (!methods || methods.length === 0) {
    methods = Object.values(DeliveryMethod);
  }

  for (const method of methods) {
    switch (method) {
      case DeliveryMethod.Header:
        decorators.push(ApiHeader({ name: 'X-RECAPTCHA-TOKEN', required: false }));
        break;
      case DeliveryMethod.Query:
        decorators.push(ApiQuery({ name: 'recaptcha_token', type: 'string', required: false }));
        break;
      case DeliveryMethod.Body:
        break;
    }
  }

  return applyDecorators(SetMetadata(RECAPTCHA_KEY, methods), ...decorators);
};
