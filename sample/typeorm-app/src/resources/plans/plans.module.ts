import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlansController } from './plans.controller';
import { PlansResolver } from './plans.resolver';
import { PlansService } from './plans.service';
import { Plan } from './entity';
import { PlansPolicy } from './policy';

@Module({
  imports: [TypeOrmModule.forFeature([Plan])],
  controllers: [PlansController],
  providers: [PlansService, PlansResolver, PlansPolicy],
  exports: [PlansService, PlansPolicy]
})
export class PlansModule {}
