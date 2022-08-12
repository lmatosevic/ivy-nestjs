import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { IsOptional, IsString } from 'class-validator';
import { Expose } from 'class-transformer';
import { CreateCategoryDto } from './create-category.dto';

@InputType()
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @Expose()
  @IsString()
  @IsOptional()
  readonly id?: string;
}
