import { Resolver } from '@nestjs/graphql';
import { ResourceResolver } from 'ivy-nestjs/resource';
import { Feature } from './schema';
import { CreateFeatureDto, UpdateFeatureDto } from './dto';
import { FeaturesService } from './features.service';
import { FeaturesPolicy } from './policy';

@Resolver(() => Feature)
export class FeaturesResolver extends ResourceResolver(Feature, CreateFeatureDto, UpdateFeatureDto) {
  constructor(private featuresService: FeaturesService, private featuresPolicy: FeaturesPolicy) {
    super(featuresService, featuresPolicy);
  }
}
