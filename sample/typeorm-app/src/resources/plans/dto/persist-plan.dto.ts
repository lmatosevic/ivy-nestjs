import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { IsInt, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';
import { CreatePlanDto } from './create-plan.dto';

@InputType()
export class PersistPlanDto extends PartialType(CreatePlanDto) {
  @Expose()
  @IsInt()
  @IsOptional()
  readonly id?: number;
}
