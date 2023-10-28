import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongooseResourceService } from 'ivy-nestjs/resource';
import { FileManager } from 'ivy-nestjs/storage';
import { Application } from './schema';

@Injectable()
export class ApplicationsService extends MongooseResourceService<Application> {
  constructor(
    @InjectModel(Application.name)
    protected applicationModel: Model<Application>,
    protected fileManager: FileManager
  ) {
    super(applicationModel, fileManager);
  }
}
