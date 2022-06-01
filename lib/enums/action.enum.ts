import { registerEnumType } from '@nestjs/graphql';

export enum Action {
  Create = 'Create',
  Read = 'Read',
  Update = 'Update',
  Delete = 'Delete',
  Manage = 'Manage'
}

registerEnumType(Action, {
  name: 'Action'
});
