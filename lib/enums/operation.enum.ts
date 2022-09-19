import { registerEnumType } from '@nestjs/graphql';

export enum Operation {
  Create = 'Create',
  Update = 'Update',
  Delete = 'Delete',
  Find = 'Find',
  Query = 'Query',
  Aggregate = 'Aggregate',
  Upload = 'Upload',
  Unlink = 'Unlink',
  All = 'All'
}

registerEnumType(Operation, {
  name: 'Operation'
});
