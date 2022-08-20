import { Field, InputType } from '@nestjs/graphql';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FilterOperator } from '../../resource';
import { FileMetaFilter } from './file-meta-filter.dto';

@InputType()
export class FileFilter {
  data?: FilterOperator;

  originalName?: FilterOperator;

  title?: FilterOperator;

  description?: FilterOperator;

  @Field(() => [FileFilter], { nullable: true })
  @ApiPropertyOptional({ type: () => [FileFilter] })
  _and?: FileFilter | FileFilter[];

  @Field(() => [FileFilter], { nullable: true })
  @ApiPropertyOptional({ type: () => [FileFilter] })
  _or?: FileFilter | FileFilter[];

  @Field(() => [FileFilter], { nullable: true })
  @ApiPropertyOptional({ type: () => [FileFilter] })
  _nor?: FileFilter | FileFilter[];

  @Field(() => [FileFilter], { nullable: true })
  @ApiPropertyOptional({ type: () => FileMetaFilter })
  meta?: FileMetaFilter;
}
