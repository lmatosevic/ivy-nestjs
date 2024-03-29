import { Field, InputType } from '@nestjs/graphql';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

@InputType()
export class AggregateRange {
  @Expose()
  @IsOptional()
  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({ type: String })
  dateField?: string;

  @Expose()
  @IsOptional()
  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({ type: String })
  start?: Date | string;

  @Expose()
  @IsOptional()
  @Field(() => String, { nullable: true })
  @ApiPropertyOptional({ type: String })
  end?: Date | string;

  @Expose()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Field(() => Number, { nullable: true })
  @ApiPropertyOptional({ type: Number })
  step?: number;
}
