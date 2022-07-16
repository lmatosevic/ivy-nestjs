import { Injectable } from '@nestjs/common';
import { Ability, InferSubjects } from '@casl/ability';
import { Can, Cannot, ResourcePolicy } from 'ivy-nestjs/resource';
import { Action } from 'ivy-nestjs/enums';
import { AuthUser } from 'ivy-nestjs/auth';
import { Plan } from '@resources/plans/schema';

type Subjects = InferSubjects<typeof Plan.name>;

export type PlanAbility = Ability<[Action, Subjects]>;

@Injectable()
export class PlansPolicy extends ResourcePolicy<PlanAbility, Subjects> {
  define(user: AuthUser, subject: Subjects, can: Can<PlanAbility>, cannot: Cannot<PlanAbility>) {
    can(Action.Manage, subject);
  }

  getSubject(): Subjects {
    return Plan.name;
  }
}
