import { CallHandler, ExecutionContext, ForbiddenException, Logger, NestInterceptor } from '@nestjs/common';
import { Ability } from '@casl/ability';
import { Observable } from 'rxjs';
import { Action, Operation } from '../../enums';
import { ContextUtil } from '../../utils';
import { extraOperations } from '../decorators';
import { ResourcePolicy } from './resource.policy';

export type PolicyRules = {
  filter?: any;
  projection?: any;
};

type AbilityCheck = {
  allowed: boolean;
  rules: any[];
};

export class ResourcePolicyInterceptor<T extends Ability> implements NestInterceptor {
  private readonly logger = new Logger(ResourcePolicyInterceptor.name);

  constructor(protected readonly resourcePolicy: ResourcePolicy<T, any>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = ContextUtil.normalizeContext(context);
    const request = ctx.switchToHttp().getRequest();
    const { user } = request;
    const handler = ctx.getHandler();
    let handlerName = `${handler?.name[0].toUpperCase()}${handler?.name.substring(1)}`;

    if (extraOperations[handlerName]) {
      handlerName = extraOperations[handlerName];
    }

    const sub = this.resourcePolicy.getSubject();

    let ability;
    try {
      ability = this.resourcePolicy.createAbilityForUser(user);
    } catch (e) {
      this.logger.error(`Error while creating ability for subject ${sub}`, e);
      throw new ForbiddenException('The user does not meet policy requirements for this operation');
    }

    let allowed = true;
    let rules = [];
    switch (handlerName) {
      case Operation.Find:
      case Operation.Query:
        ({ allowed, rules } = this.checkAbility(ability, Action.Read, sub));
        break;
      case Operation.Create:
        ({ allowed, rules } = this.checkAbility(ability, Action.Create, sub));
        break;
      case Operation.Update:
      case Operation.Upload:
      case Operation.Unlink:
        ({ allowed, rules } = this.checkAbility(ability, Action.Update, sub));
        break;
      case Operation.Delete:
        ({ allowed, rules } = this.checkAbility(ability, Action.Delete, sub));
        break;
    }

    if (!allowed) {
      throw new ForbiddenException('The user does not meet policy requirements for this operation');
    }

    if (rules.length > 0) {
      request.policyRules = this.aggregatePolicyRules(rules, request.policyRules);
    }

    return next.handle();
  }

  private checkAbility(ability: T, action: Action, subject: any): AbilityCheck {
    const allowed = ability.can(Action.Manage, subject) || ability.can(action, subject);
    const rules = ability.rulesFor(action, subject);
    return { allowed, rules };
  }

  private aggregatePolicyRules(rules: any[], currentRules: PolicyRules): PolicyRules {
    let policyRules = currentRules;
    if (!currentRules) {
      policyRules = { filter: {}, projection: {} };
    }

    for (const rule of rules) {
      if (rule.conditions) {
        for (let [condName, condValue] of Object.entries(rule.conditions)) {
          policyRules.filter[condName] = condValue;
        }
      }
      if (rule.fields) {
        for (let field of rule.fields) {
          policyRules.projection[field] = 1;
        }
      }
    }

    return policyRules;
  }
}
