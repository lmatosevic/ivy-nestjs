import { Field, InputType } from '@nestjs/graphql';
import { ApiPropertyOptional } from '@nestjs/swagger';

@InputType()
export class FilterOperator {
  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({ type: String })
  _eq?: string | number;

  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({ type: String })
  _gt?: string | number;

  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({ type: String })
  _gte?: string | number;

  @Field(() => [String], { nullable: true })
  @ApiPropertyOptional({ type: [String] })
  _in?: string[];

  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({ type: String })
  _lt?: string | number;

  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({ type: String })
  _lte?: string | number;

  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({ type: String })
  _ne?: string | number;

  @Field(() => [String], { nullable: true })
  @ApiPropertyOptional({ type: [String] })
  _nin?: string[] | number[];

  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({ type: String })
  _like?: string;

  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({ type: String })
  _ilike?: string;

  @Field(() => Boolean, { nullable: true })
  @ApiPropertyOptional({ type: Boolean })
  _exists?: boolean;

  @Field(() => [String], { nullable: true })
  @ApiPropertyOptional({ type: [String] })
  _all?: string[] | number[];

  @Field(() => FilterOperator, { nullable: true })
  @ApiPropertyOptional({ type: () => FilterOperator })
  _elemMatch?: FilterOperator;

  @Field(() => FilterOperator, { nullable: true })
  @ApiPropertyOptional({ type: () => FilterOperator })
  _not?: FilterOperator;
}
