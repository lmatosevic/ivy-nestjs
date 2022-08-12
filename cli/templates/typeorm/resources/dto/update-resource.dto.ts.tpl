import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { IsInt, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';
import { {{createDtoName}} } from './create-{{resourceFileName}}.dto';

@InputType()
export class {{updateDtoName}} extends PartialType({{createDtoName}}) {
  @Expose()
  @IsInt()
  @IsOptional()
  readonly id?: number;
}
