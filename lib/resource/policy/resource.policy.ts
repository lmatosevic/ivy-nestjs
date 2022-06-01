import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { AuthUser } from '../../auth';

export type Can<T extends Ability> = AbilityBuilder<T>['can'];
export type Cannot<T extends Ability> = AbilityBuilder<T>['cannot'];

export abstract class ResourcePolicy<T extends Ability, S> {
  createAbilityForUser(user: AuthUser): T {
    const { build, can, cannot } = new AbilityBuilder<T>(Ability as AbilityClass<T>);
    const subject = this.getSubject();

    this.define(user, subject, can, cannot);

    return build() as T;
  }

  abstract define(user: AuthUser, subject: S, can: Can<T>, cannot: Cannot<T>): void;

  abstract getSubject(): S;
}
