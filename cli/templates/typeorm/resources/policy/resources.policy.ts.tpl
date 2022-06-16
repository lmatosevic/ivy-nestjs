import { Injectable } from '@nestjs/common';
import { Ability, InferSubjects } from '@casl/ability';
import { Can, Cannot, ResourcePolicy } from 'ivy-nestjs/resource';
import { Action } from 'ivy-nestjs/enums';
import { AuthUser } from 'ivy-nestjs/auth';
import { {{resourceModelName}} } from '@resources/{{resourceNamePlural}}/entity';

type Subjects = InferSubjects<typeof {{resourceModelName}}.name>;

export type {{resourceAbilityName}} = Ability<[Action, Subjects]>;

@Injectable()
export class {{resourcePolicyName}} extends ResourcePolicy<{{resourceAbilityName}}, Subjects> {
  define(user: AuthUser, subject: Subjects, can: Can<{{resourceAbilityName}}>, cannot: Cannot<{{resourceAbilityName}}>) {
    can(Action.Manage, subject);
  }

  getSubject(): Subjects {
    return {{resourceModelName}}.name;
  }
}
