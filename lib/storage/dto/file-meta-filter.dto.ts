import { Field, InputType } from '@nestjs/graphql';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FilterOperator } from '../../resource';

@InputType()
export class FileMetaFilter {
  mimeType?: FilterOperator;

  size?: FilterOperator;

  createdAt?: FilterOperator;

  @Field(() => [FileMetaFilter], { nullable: true })
  @ApiPropertyOptional({ type: () => [FileMetaFilter] })
  _and?: FileMetaFilter | FileMetaFilter[];

  @Field(() => [FileMetaFilter], { nullable: true })
  @ApiPropertyOptional({ type: () => [FileMetaFilter] })
  _or?: FileMetaFilter | FileMetaFilter[];

  @Field(() => [FileMetaFilter], { nullable: true })
  @ApiPropertyOptional({ type: () => [FileMetaFilter] })
  _nor?: FileMetaFilter | FileMetaFilter[];
}
