import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoResourceService } from 'ivy-nestjs/resource';
import { FileManager } from 'ivy-nestjs/storage';
import { Feature } from './schema';

@Injectable()
export class FeaturesService extends MongoResourceService<Feature> {
  constructor(
    @InjectModel(Feature.name) protected featureModel: Model<Feature>,
    protected fileManager: FileManager
  ) {
    super(featureModel, fileManager);
  }
}
