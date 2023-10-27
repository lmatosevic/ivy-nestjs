import { Resolver } from '@nestjs/graphql';
import { ResourceResolver } from 'ivy-nestjs/resource';
import { Category } from './schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { CategoriesService } from './categories.service';
import { CategoriesPolicy } from './policy';

@Resolver(() => Category)
export class CategoriesResolver extends ResourceResolver(Category, CreateCategoryDto, UpdateCategoryDto) {
  constructor(
    private categoriesService: CategoriesService,
    private categoriesPolicy: CategoriesPolicy
  ) {
    super(categoriesService, categoriesPolicy);
  }
}
