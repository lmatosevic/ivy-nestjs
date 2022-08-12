import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { IsOptional, IsString } from 'class-validator';
import { Expose } from 'class-transformer';
import { {{createDtoName}} } from './create-{{resourceFileName}}.dto';

@InputType()
export class {{updateDtoName}} extends PartialType({{createDtoName}}) {
  @Expose()
  @IsString()
  @IsOptional()
  readonly id?: string;
}
