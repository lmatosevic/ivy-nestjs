import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongooseResourceService } from 'ivy-nestjs/resource';
import { FileManager } from 'ivy-nestjs/storage';
import { Project } from './schema';

@Injectable()
export class ProjectsService extends MongooseResourceService<Project> {
  constructor(
    @InjectModel(Project.name) protected projectModel: Model<Project>,
    protected fileManager: FileManager
  ) {
    super(projectModel, fileManager);
  }
}
