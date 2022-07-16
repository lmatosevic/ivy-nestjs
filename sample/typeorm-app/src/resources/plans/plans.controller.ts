import { Controller } from '@nestjs/common';
import { ResourceController } from 'ivy-nestjs/resource';
import { Plan } from './entity';
import { CreatePlanDto, UpdatePlanDto } from './dto';
import { PlansService } from './plans.service';
import { PlansPolicy } from './policy';

@Controller('plans')
export class PlansController extends ResourceController(Plan, CreatePlanDto, UpdatePlanDto) {
  constructor(private plansService: PlansService, private plansPolicy: PlansPolicy) {
    super(plansService, plansPolicy);
  }
}
