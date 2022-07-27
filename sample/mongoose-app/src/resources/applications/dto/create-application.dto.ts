import { InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsArray, IsDateString, IsHexadecimal, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

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
  @IsHexadecimal()
  readonly project: string;

  @Expose()
  @IsOptional()
  @IsArray()
  readonly reviewers?: string[];

  @Expose()
  @IsOptional()
  @IsHexadecimal()
  readonly category?: string;
}
