import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongooseResourceService } from 'ivy-nestjs/resource';
import { FileManager } from 'ivy-nestjs/storage';
import { {{resourceModelName}} } from './schema';

@Injectable()
export class {{resourceServiceName}} extends MongooseResourceService<{{resourceModelName}}> {
  constructor(
    @InjectModel({{resourceModelName}}.name) protected {{resourceName}}Model: Model<{{resourceModelName}}>,
    protected fileManager: FileManager
  ) {
    super({{resourceName}}Model, fileManager);
  }
}
