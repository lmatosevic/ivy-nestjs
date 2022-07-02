import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { IsInt, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';
import { CreateApplicationDto } from './create-application.dto';

@InputType()
export class PersistApplicationDto extends PartialType(CreateApplicationDto) {
  @Expose()
  @IsInt()
  @IsOptional()
  readonly id?: number;
}

@InputType()
export class ApplicationIdDto extends PartialType(PersistApplicationDto, { pick: ['id'] }) {}
