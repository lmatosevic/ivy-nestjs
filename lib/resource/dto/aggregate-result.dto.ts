import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';

export class AggregateResult<T> {
  date?: Date;

  result: Record<keyof T, AggregateResultValue> | Record<string, any>;
}

@ObjectType()
export class AggregateResultValue {
  @Field(() => Int, { nullable: true })
  @ApiProperty({ type: () => Number, required: false })
  count?: number;

  @Field(() => Float, { nullable: true })
  @ApiProperty({ type: () => Number, required: false })
  min?: number;

  @Field(() => Float, { nullable: true })
  @ApiProperty({ type: () => Number, required: false })
  max?: number;

  @Field(() => Float, { nullable: true })
  @ApiProperty({ type: () => Number, required: false })
  avg?: number;

  @Field(() => Float, { nullable: true })
  @ApiProperty({ type: () => Number, required: false })
  sum?: number;

  @Field(() => Float, { nullable: true })
  @ApiProperty({ type: () => Number, required: false })
  first?: number;

  @Field(() => Float, { nullable: true })
  @ApiProperty({ type: () => Number, required: false })
  last?: number;
}
