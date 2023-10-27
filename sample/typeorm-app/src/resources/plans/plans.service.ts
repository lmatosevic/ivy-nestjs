import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileManager } from 'ivy-nestjs/storage';
import { TypeOrmResourceService } from 'ivy-nestjs/resource';
import { Plan } from './entity';

@Injectable()
export class PlansService extends TypeOrmResourceService<Plan> {
  constructor(
    @InjectRepository(Plan) protected planRepository: Repository<Plan>,
    protected fileManager: FileManager
  ) {
    super(planRepository, fileManager);
  }
}
