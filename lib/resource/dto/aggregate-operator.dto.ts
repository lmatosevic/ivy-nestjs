import { Field, InputType } from '@nestjs/graphql';
import { ApiPropertyOptional } from '@nestjs/swagger';

@InputType()
export class AggregateOperator {
  @Field(() => Boolean, { nullable: true })
  @ApiPropertyOptional({ type: Boolean })
  count?: boolean;

  @Field(() => Boolean, { nullable: true })
  @ApiPropertyOptional({ type: Boolean })
  min?: boolean;

  @Field(() => Boolean, { nullable: true })
  @ApiPropertyOptional({ type: Boolean })
  max?: boolean;

  @Field(() => Boolean, { nullable: true })
  @ApiPropertyOptional({ type: Boolean })
  avg?: boolean;

  @Field(() => Boolean, { nullable: true })
  @ApiPropertyOptional({ type: Boolean })
  sum?: boolean;
}
