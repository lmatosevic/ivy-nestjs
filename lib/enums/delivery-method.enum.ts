import { registerEnumType } from '@nestjs/graphql';

export enum DeliveryMethod {
  Header = 'Header',
  Query = 'Query',
  Body = 'Body'
}

registerEnumType(DeliveryMethod, {
  name: 'DeliveryMethod'
});
