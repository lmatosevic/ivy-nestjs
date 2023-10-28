import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongooseResourceService } from 'ivy-nestjs/resource';
import { FileManager } from 'ivy-nestjs/storage';
import { Category } from './schema';

@Injectable()
export class CategoriesService extends MongooseResourceService<Category> {
  constructor(
    @InjectModel(Category.name) protected categoryModel: Model<Category>,
    protected fileManager: FileManager
  ) {
    super(categoryModel, fileManager);
  }
}
