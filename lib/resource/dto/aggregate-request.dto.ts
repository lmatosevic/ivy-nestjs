import { IsOptional } from 'class-validator';
import { FilterQueryType } from './query-request.dto';
import { AggregateRange } from './aggregate-range.dto';
import { AggregateResultValue } from './aggregate-result.dto';

export type AggregateSelectType<T> =
  | Record<keyof T | string, Record<keyof AggregateResultValue, boolean | number> | Record<string, any>>
  | Record<string, any>;

export class AggregateRequest<T> {
  select: AggregateSelectType<T>;

  @IsOptional()
  filter?: FilterQueryType<T>;

  @IsOptional()
  range?: AggregateRange;
}
