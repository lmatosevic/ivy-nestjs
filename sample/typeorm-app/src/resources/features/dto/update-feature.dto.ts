import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { IsInt, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';
import { CreateFeatureDto } from './create-feature.dto';

@InputType()
export class UpdateFeatureDto extends PartialType(CreateFeatureDto) {
  @Expose()
  @IsInt()
  @IsOptional()
  readonly id?: number;
}
