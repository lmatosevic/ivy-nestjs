import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeaturesController } from './features.controller';
import { FeaturesResolver } from './features.resolver';
import { FeaturesService } from './features.service';
import { Feature, FeatureSchema } from './schema';
import { FeaturesPolicy } from './policy';

@Module({
  imports: [MongooseModule.forFeature([{ name: Feature.name, schema: FeatureSchema }])],
  controllers: [FeaturesController],
  providers: [FeaturesService, FeaturesResolver, FeaturesPolicy],
  exports: [FeaturesService, FeaturesPolicy]
})
export class FeaturesModule {}
