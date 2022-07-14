import { Field, InputType, Int } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';

@InputType()
export class FilterOperator {
  _eq?: string;

  _gt?: string;

  _gte?: string;

  _in?: string[];

  _lt?: string;

  _lte?: string;

  _ne?: string;

  _nin?: string[];

  _regex?: string;

  _exists?: boolean;

  _all?: string[];

  @Field(() => Int, { nullable: true })
  _size?: number;

  @ApiProperty({ type: () => FilterOperator, required: false })
  _elemMatch?: FilterOperator;

  @ApiProperty({ type: () => FilterOperator, required: false })
  _not?: FilterOperator;
}
