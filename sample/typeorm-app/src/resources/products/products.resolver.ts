import { Resolver } from '@nestjs/graphql';
import { ResourceResolver } from 'ivy-nestjs/resource';
import { Product } from './entity';
import { CreateProductDto, UpdateProductDto } from './dto';
import { ProductsService } from './products.service';
import { ProductsPolicy } from './policy';

@Resolver(() => Product)
export class ProductsResolver extends ResourceResolver(Product, CreateProductDto, UpdateProductDto) {
  constructor(private productsService: ProductsService, private productsPolicy: ProductsPolicy) {
    super(productsService, productsPolicy);
  }
}
