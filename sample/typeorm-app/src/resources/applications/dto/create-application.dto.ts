import { InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateApplicationDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly title: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  readonly scheduledAt?: Date;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  readonly project?: number;

  @Expose()
  @IsOptional()
  @IsInt({ each: true })
  @IsArray()
  readonly reviewers?: number[];
}
