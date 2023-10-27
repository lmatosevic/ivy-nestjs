import { Injectable } from '@nestjs/common';
import { PureAbility, InferSubjects } from '@casl/ability';
import { Can, Cannot, ResourcePolicy } from 'ivy-nestjs/resource';
import { Action, Role } from 'ivy-nestjs/enums';
import { AuthUser } from 'ivy-nestjs/auth';
import { User } from '@resources/users/entity';

type Subjects = InferSubjects<typeof User.name>;

export type UserAbility = PureAbility<[Action, Subjects]>;

@Injectable()
export class UsersPolicy extends ResourcePolicy<UserAbility, Subjects> {
  define(user: AuthUser, subject: Subjects, can: Can<UserAbility>, cannot: Cannot<UserAbility>) {
    if (user?.hasRole(Role.Admin)) {
      can(Action.Manage, subject);
    } else {
      can(Action.Update, subject, ['firstName', 'lastName', 'email', 'avatar', 'passwordHash', 'logoutAt'], {
        id: user?.getId()
      });
      can(
        Action.Read,
        subject,
        ['firstName', 'lastName', 'email', 'createdAt', 'avatar', 'avatar.meta', 'projects', 'projects.plan'],
        {
          id: user?.getId()
        }
      );
      cannot(Action.Delete, subject);
      cannot(Action.Create, subject);
    }
  }

  getSubject(): Subjects {
    return User.name;
  }
}
