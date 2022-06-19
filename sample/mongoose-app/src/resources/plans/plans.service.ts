import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoResourceService } from 'ivy-nestjs/resource';
import { FileManager } from 'ivy-nestjs/storage';
import { Plan } from './schema';

@Injectable()
export class PlansService extends MongoResourceService<Plan> {
  constructor(
    @InjectModel(Plan.name) protected planModel: Model<Plan>,
    protected fileManager: FileManager
  ) {
    super(planModel, fileManager);
  }
}
