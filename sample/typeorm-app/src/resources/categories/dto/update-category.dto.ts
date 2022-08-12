import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { IsInt, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';
import { CreateCategoryDto } from './create-category.dto';

@InputType()
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @Expose()
  @IsInt()
  @IsOptional()
  readonly id?: number;
}
