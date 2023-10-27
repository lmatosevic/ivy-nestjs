import { Injectable } from '@nestjs/common';
import { PureAbility, InferSubjects } from '@casl/ability';
import { Can, Cannot, ResourcePolicy } from 'ivy-nestjs/resource';
import { Action } from 'ivy-nestjs/enums';
import { AuthUser } from 'ivy-nestjs/auth';
import { {{resourceModelName}} } from '@resources/{{resourceFileNamePlural}}/schema';

type Subjects = InferSubjects<typeof {{resourceModelName}}.name>;

export type {{resourceAbilityName}} = PureAbility<[Action, Subjects]>;

@Injectable()
export class {{resourcePolicyName}} extends ResourcePolicy<{{resourceAbilityName}}, Subjects> {
  define(user: AuthUser, subject: Subjects, can: Can<{{resourceAbilityName}}>, cannot: Cannot<{{resourceAbilityName}}>) {
    can(Action.Manage, subject);
  }

  getSubject(): Subjects {
    return {{resourceModelName}}.name;
  }
}
