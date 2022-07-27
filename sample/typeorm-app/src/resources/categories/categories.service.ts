import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileManager } from 'ivy-nestjs/storage';
import { TypeOrmResourceService } from 'ivy-nestjs/resource';
import { Category } from './entity';

@Injectable()
export class CategoriesService extends TypeOrmResourceService<Category> {
  constructor(
    @InjectRepository(Category) protected categoryRepository: Repository<Category>,
    protected fileManager: FileManager
  ) {
    super(categoryRepository, fileManager);
  }
}
