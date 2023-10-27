import { Controller } from '@nestjs/common';
import { ResourceController } from 'ivy-nestjs/resource';
import { Category } from './entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { CategoriesService } from './categories.service';
import { CategoriesPolicy } from './policy';

@Controller('categories')
export class CategoriesController extends ResourceController(Category, CreateCategoryDto, UpdateCategoryDto) {
  constructor(
    private categoriesService: CategoriesService,
    private categoriesPolicy: CategoriesPolicy
  ) {
    super(categoriesService, categoriesPolicy);
  }
}
