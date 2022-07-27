import { InputType } from '@nestjs/graphql';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FilterOperator } from '../../resource';
import { FileMetaFilter } from './file-meta-filter.dto';

@InputType()
export class FileFilter {
  data?: FilterOperator;

  originalName?: FilterOperator;

  title?: FilterOperator;

  description?: FilterOperator;

  @ApiPropertyOptional({ type: () => FileFilter })
  _and?: FileFilter;

  @ApiPropertyOptional({ type: () => FileFilter })
  _or?: FileFilter;

  @ApiPropertyOptional({ type: () => FileFilter })
  _nor?: FileFilter;

  @ApiPropertyOptional({ type: () => FileMetaFilter })
  meta?: FileMetaFilter;
}
