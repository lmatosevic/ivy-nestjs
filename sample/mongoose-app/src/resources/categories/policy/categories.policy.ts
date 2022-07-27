import { Injectable } from '@nestjs/common';
import { Ability, InferSubjects } from '@casl/ability';
import { Can, Cannot, ResourcePolicy } from 'ivy-nestjs/resource';
import { Action } from 'ivy-nestjs/enums';
import { AuthUser } from 'ivy-nestjs/auth';
import { Category } from '@resources/categories/schema';

type Subjects = InferSubjects<typeof Category.name>;

export type CategoryAbility = Ability<[Action, Subjects]>;

@Injectable()
export class CategoriesPolicy extends ResourcePolicy<CategoryAbility, Subjects> {
  define(user: AuthUser, subject: Subjects, can: Can<CategoryAbility>, cannot: Cannot<CategoryAbility>) {
    can(Action.Manage, subject);
  }

  getSubject(): Subjects {
    return Category.name;
  }
}
