import { InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsString, IsOptional } from 'class-validator';
import { PartialType } from 'ivy-nestjs/resource';
import { CreateCategoryDto } from './create-category.dto';

@InputType()
export class PersistCategoryDto extends PartialType(CreateCategoryDto) {
  @Expose()
  @IsString()
  @IsOptional()
  readonly id?: string;
}
