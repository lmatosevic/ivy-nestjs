import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { CreateCategoryDto } from './create-category.dto';

@InputType()
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
