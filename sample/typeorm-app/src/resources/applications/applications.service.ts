import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileManager } from 'ivy-nestjs/storage';
import { TypeOrmResourceService } from 'ivy-nestjs/resource';
import { Application } from './entity';

@Injectable()
export class ApplicationsService extends TypeOrmResourceService<Application> {
  constructor(
    @InjectRepository(Application)
    protected applicationRepository: Repository<Application>,
    protected fileManager: FileManager
  ) {
    super(applicationRepository, fileManager);
  }
}
