import { InputType } from '@nestjs/graphql';
import { FilterOperator } from '../../resource';

@InputType()
export class FileFilter {
  data?: FilterOperator;

  originalName?: FilterOperator;

  title?: FilterOperator;

  description?: FilterOperator;
}
