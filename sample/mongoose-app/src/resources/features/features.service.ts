import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongooseResourceService } from 'ivy-nestjs/resource';
import { FileManager } from 'ivy-nestjs/storage';
import { Feature } from './schema';

@Injectable()
export class FeaturesService extends MongooseResourceService<Feature> {
  constructor(
    @InjectModel(Feature.name) protected featureModel: Model<Feature>,
    protected fileManager: FileManager
  ) {
    super(featureModel, fileManager);
  }
}
