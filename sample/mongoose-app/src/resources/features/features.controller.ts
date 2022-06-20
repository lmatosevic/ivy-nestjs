import { Controller } from '@nestjs/common';
import { ResourceController } from 'ivy-nestjs/resource';
import { Feature } from './schema';
import { CreateFeatureDto, UpdateFeatureDto } from './dto';
import { FeaturesService } from './features.service';
import { FeaturesPolicy } from './policy';

@Controller('features')
export class FeaturesController extends ResourceController(Feature, CreateFeatureDto, UpdateFeatureDto) {
  constructor(private featuresService: FeaturesService, private featuresPolicy: FeaturesPolicy) {
    super(featuresService, featuresPolicy);
  }
}
