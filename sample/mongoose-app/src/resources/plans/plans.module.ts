import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlansController } from './plans.controller';
import { PlansResolver } from './plans.resolver';
import { PlansService } from './plans.service';
import { Plan, PlanSchema } from './schema';
import { PlansPolicy } from './policy';

@Module({
  imports: [MongooseModule.forFeature([{ name: Plan.name, schema: PlanSchema }])],
  controllers: [PlansController],
  providers: [PlansService, PlansResolver, PlansPolicy],
  exports: [PlansService, PlansPolicy]
})
export class PlansModule {}
