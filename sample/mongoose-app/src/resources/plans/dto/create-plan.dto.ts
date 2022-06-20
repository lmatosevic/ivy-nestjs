import { InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreatePlanDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name: string;

  @Expose()
  @IsOptional()
  @IsArray()
  readonly features?: string[];
}
