import { Injectable } from '@nestjs/common';
import { PureAbility, InferSubjects } from '@casl/ability';
import { Can, Cannot, ResourcePolicy } from 'ivy-nestjs/resource';
import { Action } from 'ivy-nestjs/enums';
import { AuthUser } from 'ivy-nestjs/auth';
import { Feature } from '@resources/features/schema';

type Subjects = InferSubjects<typeof Feature.name>;

export type FeatureAbility = PureAbility<[Action, Subjects]>;

@Injectable()
export class FeaturesPolicy extends ResourcePolicy<FeatureAbility, Subjects> {
  define(user: AuthUser, subject: Subjects, can: Can<FeatureAbility>, cannot: Cannot<FeatureAbility>) {
    can(Action.Manage, subject);
  }

  getSubject(): Subjects {
    return Feature.name;
  }
}
