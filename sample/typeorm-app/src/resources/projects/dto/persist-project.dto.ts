import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { IsInt, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';
import { CreateProjectDto } from './create-project.dto';

@InputType()
export class PersistProjectDto extends PartialType(CreateProjectDto) {
  @Expose()
  @IsInt()
  @IsOptional()
  readonly id?: number;
}

@InputType()
export class ProjectIdDto extends PartialType(PersistProjectDto, { pick: ['id'] }) {}
