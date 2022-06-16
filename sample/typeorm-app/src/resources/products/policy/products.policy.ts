import { Injectable } from '@nestjs/common';
import { Ability, InferSubjects } from '@casl/ability';
import { Can, Cannot, ResourcePolicy } from 'ivy-nestjs/resource';
import { Action } from 'ivy-nestjs/enums';
import { AuthUser } from 'ivy-nestjs/auth';
import { Product } from '@resources/products/entity';

type Subjects = InferSubjects<typeof Product.name>;

export type ProductAbility = Ability<[Action, Subjects]>;

@Injectable()
export class ProductsPolicy extends ResourcePolicy<ProductAbility, Subjects> {
  define(user: AuthUser, subject: Subjects, can: Can<ProductAbility>, cannot: Cannot<ProductAbility>) {
    can(Action.Manage, subject);
  }

  getSubject(): Subjects {
    return Product.name;
  }
}
