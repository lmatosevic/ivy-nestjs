import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { IsOptional, IsString } from 'class-validator';
import { Expose } from 'class-transformer';
import { CreateProjectDto } from './create-project.dto';

@InputType()
export class PersistProjectDto extends PartialType(CreateProjectDto) {
  @Expose()
  @IsString()
  @IsOptional()
  readonly id?: string;
}
