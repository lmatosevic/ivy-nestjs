import { Field, InputType } from '@nestjs/graphql';
import { ApiPropertyOptional } from '@nestjs/swagger';

@InputType()
export class AggregateRange {
  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({ type: String })
  start?: Date | string;

  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({ type: String })
  end?: Date | string;

  @Field(() => Number, { nullable: true })
  @ApiPropertyOptional({ type: Number })
  step?: number;
}
