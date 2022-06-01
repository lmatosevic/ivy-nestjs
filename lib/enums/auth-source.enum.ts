import { registerEnumType } from '@nestjs/graphql';

export enum AuthSource {
  Local = 'Local',
  Google = 'Google',
  Facebook = 'Facebook'
}

registerEnumType(AuthSource, {
  name: 'AuthSource'
});
