import { Controller } from '@nestjs/common';
import { ResourceController } from 'ivy-nestjs/resource';
import { Product } from './entity';
import { CreateProductDto, UpdateProductDto } from './dto';
import { ProductsService } from './products.service';
import { ProductsPolicy } from './policy';

@Controller('products')
export class ProductsController extends ResourceController(Product, CreateProductDto, UpdateProductDto) {
  constructor(private productsService: ProductsService, private productsPolicy: ProductsPolicy) {
    super(productsService, productsPolicy);
  }
}
