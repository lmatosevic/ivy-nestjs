import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { IsOptional, IsString } from 'class-validator';
import { Expose } from 'class-transformer';
import { CreateApplicationDto } from './create-application.dto';

@InputType()
export class PersistApplicationDto extends PartialType(CreateApplicationDto) {
  @Expose()
  @IsString()
  @IsOptional()
  readonly id?: string;
}
