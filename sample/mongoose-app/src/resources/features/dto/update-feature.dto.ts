import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { IsOptional, IsString } from 'class-validator';
import { Expose } from 'class-transformer';
import { CreateFeatureDto } from './create-feature.dto';

@InputType()
export class UpdateFeatureDto extends PartialType(CreateFeatureDto) {
  @Expose()
  @IsString()
  @IsOptional()
  readonly id?: string;
}
