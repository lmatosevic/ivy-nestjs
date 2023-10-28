import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongooseResourceService } from 'ivy-nestjs/resource';
import { FileManager } from 'ivy-nestjs/storage';
import { Plan } from './schema';

@Injectable()
export class PlansService extends MongooseResourceService<Plan> {
  constructor(
    @InjectModel(Plan.name) protected planModel: Model<Plan>,
    protected fileManager: FileManager
  ) {
    super(planModel, fileManager);
  }
}
