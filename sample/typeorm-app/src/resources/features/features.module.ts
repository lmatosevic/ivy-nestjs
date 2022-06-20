import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeaturesService } from './features.service';
import { Feature } from './entity';
import { FeaturesPolicy } from './policy';

@Module({
  imports: [TypeOrmModule.forFeature([Feature])],
  controllers: [],
  providers: [FeaturesService, FeaturesPolicy],
  exports: [FeaturesService, FeaturesPolicy]
})
export class FeaturesModule {}
