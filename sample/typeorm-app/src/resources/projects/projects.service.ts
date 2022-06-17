import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileManager } from 'ivy-nestjs/storage';
import { TypeOrmResourceService } from 'ivy-nestjs/resource';
import { Project } from './entity';

@Injectable()
export class ProjectsService extends TypeOrmResourceService<Project> {
  constructor(
    @InjectRepository(Project) protected projectRepository: Repository<Project>,
    protected fileManager: FileManager
  ) {
    super(projectRepository, fileManager);
  }
}
