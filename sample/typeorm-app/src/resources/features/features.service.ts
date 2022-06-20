import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileManager } from 'ivy-nestjs/storage';
import { TypeOrmResourceService } from 'ivy-nestjs/resource';
import { Feature } from './entity';

@Injectable()
export class FeaturesService extends TypeOrmResourceService<Feature> {
  constructor(
    @InjectRepository(Feature) protected featureRepository: Repository<Feature>,
    protected fileManager: FileManager
  ) {
    super(featureRepository, fileManager);
  }
}
