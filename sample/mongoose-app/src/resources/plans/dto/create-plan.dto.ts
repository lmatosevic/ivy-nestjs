import { InputType } from '@nestjs/graphql';
import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  MaxLength,
  ValidateNested
} from 'class-validator';
import { PersistFeatureDto } from '@resources/features/dto';

@InputType()
export class CreatePlanDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name: string;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersistFeatureDto)
  readonly features?: PersistFeatureDto[];
}
