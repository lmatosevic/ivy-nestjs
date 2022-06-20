import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { CreateFeatureDto } from './create-feature.dto';

@InputType()
export class UpdateFeatureDto extends PartialType(CreateFeatureDto) {}
