import { InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsHexadecimal, IsNotEmpty, MaxLength } from 'class-validator';

@InputType()
export class CreateFeatureDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name: string;

  @Expose()
  @IsNotEmpty()
  @IsHexadecimal()
  readonly plan: string;
}
