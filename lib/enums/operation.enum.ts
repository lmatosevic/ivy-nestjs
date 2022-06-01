import { registerEnumType } from '@nestjs/graphql';

export enum Operation {
  Create = 'Create',
  Update = 'Update',
  Delete = 'Delete',
  Find = 'Find',
  Query = 'Query',
  Upload = 'Upload',
  All = 'All'
}

registerEnumType(Operation, {
  name: 'Operation'
});
