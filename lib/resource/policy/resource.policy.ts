import { PureAbility, AbilityBuilder, AbilityClass, ExtractSubjectType, MatchConditions } from '@casl/ability';
import { AuthUser } from '../../auth';

export type Can<T extends PureAbility> = AbilityBuilder<T>['can'];
export type Cannot<T extends PureAbility> = AbilityBuilder<T>['cannot'];

export abstract class ResourcePolicy<T extends PureAbility, S> {
  createAbilityForUser(user: AuthUser): T {
    const { build, can, cannot } = new AbilityBuilder<T>(PureAbility as AbilityClass<T>);
    const subject = this.getSubject();

    this.define(user, subject, can, cannot);

    return build({
      fieldMatcher: () => () => true,
      conditionsMatcher: (matcher: MatchConditions) => matcher,
      detectSubjectType: (item) => item.constructor as ExtractSubjectType<S>
    }) as T;
  }

  abstract define(user: AuthUser, subject: S, can: Can<T>, cannot: Cannot<T>): void;

  abstract getSubject(): S;
}
