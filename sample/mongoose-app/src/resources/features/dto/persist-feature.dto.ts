import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { CreateFeatureDto } from './create-feature.dto';
import { IsOptional, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

@InputType()
export class PersistFeatureDto extends PartialType(CreateFeatureDto) {
  @Expose()
  @IsString()
  @IsOptional()
  readonly id?: string;
}
