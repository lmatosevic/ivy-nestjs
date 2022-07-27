import { InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsHexadecimal, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateCategoryDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name: string;

  @Expose()
  @IsOptional()
  @IsHexadecimal()
  readonly parent?: string;
}
