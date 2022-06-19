import { InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreatePlanDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name: string;

  @Expose()
  @IsOptional()
  @IsInt()
  readonly projectId?: number;
}
