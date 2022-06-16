import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoResourceService } from 'ivy-nestjs/resource';
import { FileManager } from 'ivy-nestjs/storage';
import { Project } from './schema';

@Injectable()
export class ProjectsService extends MongoResourceService<Project> {
  constructor(
    @InjectModel(Project.name) protected projectModel: Model<Project>,
    protected fileManager: FileManager
  ) {
    super(projectModel, fileManager);
  }
}
