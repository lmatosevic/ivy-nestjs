import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './categories.controller';
import { CategoriesResolver } from './categories.resolver';
import { CategoriesService } from './categories.service';
import { Category } from './entity';
import { CategoriesPolicy } from './policy';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesResolver, CategoriesPolicy],
  exports: [CategoriesService, CategoriesPolicy]
})
export class CategoriesModule {}
