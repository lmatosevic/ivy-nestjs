import { Injectable } from '@nestjs/common';
import { Ability, InferSubjects } from '@casl/ability';
import { Can, Cannot, ResourcePolicy } from 'ivy-nestjs/resource';
import { Action } from 'ivy-nestjs/enums';
import { AuthUser } from 'ivy-nestjs/auth';
import { Application } from '@resources/applications/schema';

type Subjects = InferSubjects<typeof Application.name>;

export type ApplicationAbility = Ability<[Action, Subjects]>;

@Injectable()
export class ApplicationsPolicy extends ResourcePolicy<
  ApplicationAbility,
  Subjects
> {
  define(
    user: AuthUser,
    subject: Subjects,
    can: Can<ApplicationAbility>,
    cannot: Cannot<ApplicationAbility>
  ) {
    can(Action.Manage, subject);
  }

  getSubject(): Subjects {
    return Application.name;
  }
}
