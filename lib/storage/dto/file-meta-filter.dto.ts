import { InputType } from '@nestjs/graphql';
import { FilterOperator } from '../../resource';
import { ApiPropertyOptional } from '@nestjs/swagger';

@InputType()
export class FileMetaFilter {
  mimeType?: FilterOperator;

  size?: FilterOperator;

  createdAt?: FilterOperator;

  @ApiPropertyOptional({ type: () => FileMetaFilter })
  _and?: FileMetaFilter;

  @ApiPropertyOptional({ type: () => FileMetaFilter })
  _or?: FileMetaFilter;

  @ApiPropertyOptional({ type: () => FileMetaFilter })
  _nor?: FileMetaFilter;
}
