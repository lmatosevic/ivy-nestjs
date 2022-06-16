import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileManager } from 'ivy-nestjs/storage';
import { TypeOrmResourceService } from 'ivy-nestjs/resource';
import { Product } from './entity';

@Injectable()
export class ProductsService extends TypeOrmResourceService<Product> {
  constructor(
    @InjectRepository(Product) protected productRepository: Repository<Product>,
    protected fileManager: FileManager
  ) {
    super(productRepository, fileManager);
  }
}
