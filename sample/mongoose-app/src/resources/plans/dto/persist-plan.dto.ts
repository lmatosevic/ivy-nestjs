import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { IsOptional, IsString } from 'class-validator';
import { Expose } from 'class-transformer';
import { CreatePlanDto } from './create-plan.dto';

@InputType()
export class PersistPlanDto extends PartialType(CreatePlanDto) {
  @Expose()
  @IsString()
  @IsOptional()
  readonly id?: string;
}
