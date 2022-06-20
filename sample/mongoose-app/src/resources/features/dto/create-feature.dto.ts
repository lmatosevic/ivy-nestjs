import { InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsNotEmpty, MaxLength } from 'class-validator';

@InputType()
export class CreateFeatureDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name: string;
}
