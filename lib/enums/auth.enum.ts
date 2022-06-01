import { registerEnumType } from '@nestjs/graphql';

export enum AuthType {
  Basic = 'Basic',
  Jwt = 'Jwt',
  OAuth2 = 'OAuth2',
  ApiKey = 'ApiKey'
}

registerEnumType(AuthType, {
  name: 'AuthType'
});
