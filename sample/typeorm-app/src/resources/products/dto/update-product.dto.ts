import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { CreateProductDto } from './create-product.dto';

@InputType()
export class UpdateProductDto extends PartialType(CreateProductDto) {}
