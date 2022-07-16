import { Resolver } from '@nestjs/graphql';
import { ResourceResolver } from 'ivy-nestjs/resource';
import { Plan } from './schema';
import { CreatePlanDto, UpdatePlanDto } from './dto';
import { PlansService } from './plans.service';
import { PlansPolicy } from './policy';

@Resolver(() => Plan)
export class PlansResolver extends ResourceResolver(
  Plan,
  CreatePlanDto,
  UpdatePlanDto
) {
  constructor(
    private plansService: PlansService,
    private plansPolicy: PlansPolicy
  ) {
    super(plansService, plansPolicy);
  }
}
