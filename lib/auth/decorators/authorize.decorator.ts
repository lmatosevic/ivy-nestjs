import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import {
  ApiBasicAuth,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOAuth2,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { AuthType } from '../../enums';
import { ShortErrorResponse } from '../../resource';
import { AuthMultiGuard } from '../auth-multi.guard';

export const AUTH_KEY = 'authType';
export const SCOPE_KEY = 'scopes';

export const Authorized = (...types: AuthType[] | string[]) => {
  const decorators = [];

  if (!types || types.length === 0) {
    types = Object.values(AuthType);
  }

  let scopes = types.filter((t) => !Object.values(AuthType).includes(t as AuthType));
  scopes = scopes.length > 0 ? scopes : ['*'];

  types = types.filter((t) => Object.values(AuthType).includes(t as AuthType));

  for (const type of types) {
    switch (type) {
      case AuthType.Basic:
        decorators.push(ApiBasicAuth());
        break;
      case AuthType.Jwt:
        decorators.push(ApiBearerAuth());
        break;
      case AuthType.OAuth2:
        decorators.push(ApiOAuth2(scopes));
        break;
      case AuthType.ApiKey:
        break;
    }
  }

  if (types.length === 0) {
    return applyDecorators(SetMetadata(AUTH_KEY, types), SetMetadata(SCOPE_KEY, scopes));
  }

  return applyDecorators(
    SetMetadata(AUTH_KEY, types),
    SetMetadata(SCOPE_KEY, scopes),
    UseGuards(AuthMultiGuard),
    ApiUnauthorizedResponse({ description: 'Unauthorized', type: ShortErrorResponse }),
    ApiForbiddenResponse({ description: 'Forbidden', type: ShortErrorResponse }),
    ...decorators
  );
};
