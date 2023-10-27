import { Injectable } from '@nestjs/common';
import { PureAbility, InferSubjects } from '@casl/ability';
import { Can, Cannot, ResourcePolicy } from 'ivy-nestjs/resource';
import { Action } from 'ivy-nestjs/enums';
import { AuthUser } from 'ivy-nestjs/auth';
import { Project } from '@resources/projects/entity';

type Subjects = InferSubjects<typeof Project.name>;

export type ProjectAbility = PureAbility<[Action, Subjects]>;

@Injectable()
export class ProjectsPolicy extends ResourcePolicy<ProjectAbility, Subjects> {
  define(user: AuthUser, subject: Subjects, can: Can<ProjectAbility>, cannot: Cannot<ProjectAbility>) {
    can(Action.Manage, subject);
  }

  getSubject(): Subjects {
    return Project.name;
  }
}
