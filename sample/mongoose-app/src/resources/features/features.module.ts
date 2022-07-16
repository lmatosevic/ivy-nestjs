import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeaturesService } from './features.service';
import { Feature, FeatureSchema } from './schema';
import { FeaturesPolicy } from './policy';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Feature.name, schema: FeatureSchema }])
  ],
  controllers: [],
  providers: [FeaturesService, FeaturesPolicy],
  exports: [FeaturesService, FeaturesPolicy]
})
export class FeaturesModule {}
