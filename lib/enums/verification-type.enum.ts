import { registerEnumType } from '@nestjs/graphql';

export enum VerificationType {
  Email = 'Email',
  Password = 'Password',
  Other = 'Other'
}

registerEnumType(VerificationType, {
  name: 'VerificationType'
});
