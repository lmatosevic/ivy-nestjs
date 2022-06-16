import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileManager } from 'ivy-nestjs/storage';
import { TypeOrmResourceService } from 'ivy-nestjs/resource';
import { {{resourceModelName}} } from './entity';

@Injectable()
export class {{resourceServiceName}} extends TypeOrmResourceService<{{resourceModelName}}> {
  constructor(
    @InjectRepository({{resourceModelName}}) protected {{resourceName}}Repository: Repository<{{resourceModelName}}>,
    protected fileManager: FileManager
  ) {
    super({{resourceName}}Repository, fileManager);
  }
}
