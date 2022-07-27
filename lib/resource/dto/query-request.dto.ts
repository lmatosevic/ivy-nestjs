import { IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FilterOperator } from './filter-operator.dto';

type FilterOperatorType<T> = Record<keyof T, FilterOperator>;

type FilterQuerySubType<T> =
  | T
  | Record<string, any>
  | FilterOperatorType<T>
  | Record<'_and' | '_or' | '_nor', FilterOperatorType<T>>;

export type FilterQueryType<T> =
  | T
  | Record<string, any>
  | FilterOperatorType<T>
  | Record<'_and' | '_or' | '_nor', FilterQuerySubType<T>>;

export type SortType = 'asc' | 'desc';

export class QueryRequest<T> {
  @IsOptional()
  filter?: FilterQueryType<T>;

  @Min(1)
  @IsOptional()
  page?: number;

  @Min(0)
  @IsOptional()
  size?: number;

  @ApiProperty({
    oneOf: [
      { type: 'string' },
      {
        type: 'object',
        additionalProperties: {
          oneOf: [{ type: 'number' }, { type: 'string', enum: ['asc', 'desc'] }]
        }
      }
    ]
  })
  @IsOptional()
  sort?: string | Record<string, number | SortType>;
}
