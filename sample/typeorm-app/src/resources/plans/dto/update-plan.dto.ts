import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { CreatePlanDto } from './create-plan.dto';

@InputType()
export class UpdatePlanDto extends PartialType(CreatePlanDto) {}
