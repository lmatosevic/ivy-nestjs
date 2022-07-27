import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesController } from './categories.controller';
import { CategoriesResolver } from './categories.resolver';
import { CategoriesService } from './categories.service';
import { Category, CategorySchema } from './schema';
import { CategoriesPolicy } from './policy';

@Module({
  imports: [MongooseModule.forFeature([{ name: Category.name, schema: CategorySchema }])],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesResolver, CategoriesPolicy],
  exports: [CategoriesService, CategoriesPolicy]
})
export class CategoriesModule {}
