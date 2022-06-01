import { registerEnumType } from '@nestjs/graphql';

export enum Role {
  User = 'User',
  Admin = 'Admin'
}

registerEnumType(Role, {
  name: 'Role'
});
