import { ApiProperty } from '@nestjs/swagger';
import { Field } from '@nestjs/graphql';
import { AggregateResult, AggregateResultValue } from './aggregate-result.dto';

export class AggregateResponse<T> {
  total: Record<keyof T, AggregateResultValue> | Record<string, any>;

  @Field(() => [AggregateResult])
  @ApiProperty({ type: () => [AggregateResult] })
  items: AggregateResult<T>[];
}
