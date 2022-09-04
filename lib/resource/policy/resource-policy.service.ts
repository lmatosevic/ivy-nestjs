import { PolicyRules } from './resource-policy.interceptor';
import { RequestContext } from '../../context';
import { AuthUser } from '../../auth';
import { Action } from '../../enums';
import { RequestUtil } from '../../utils';
import * as _ from 'lodash';

export abstract class ResourcePolicyService {
  protected constructor(protected idFieldName?: string, protected isProtected?: boolean) {}

  intersectFields(object: any): any {
    const allowedFields = this.policyProjection(true, false);

    object = RequestUtil.mapIdKeys(object, this.idFieldName);

    if (!object || !allowedFields || Object.keys(allowedFields).length === 0) {
      return object;
    }

    let dtoObject = {};
    if (Array.isArray(object)) {
      for (const field of object) {
        dtoObject[field] = 1;
      }
    } else {
      dtoObject = object;
    }

    const fields = Object.keys(allowedFields).filter((f) => allowedFields[f]);
    return _.pick(dtoObject, fields);
  }

  policyFilter(forceReadPolicy: boolean = true): any {
    const policyRules = this.getPolicyRules(forceReadPolicy);
    if (!policyRules || Object.keys(policyRules).length === 0) {
      return {};
    }
    return policyRules.filter;
  }

  policyProjection(excludeSubFields = true, forceReadPolicy: boolean = true): any {
    const policyRules = this.getPolicyRules(forceReadPolicy);
    if (!policyRules || Object.keys(policyRules).length === 0) {
      return {};
    }

    if (excludeSubFields) {
      return Object.fromEntries(
        Object.entries(policyRules.projection).filter(([key, _]) => !key.includes('.'))
      );
    } else {
      return policyRules.projection;
    }
  }

  getPolicyRules(forceReadPolicy: boolean = false): PolicyRules {
    if (!this.isProtected) {
      return {};
    }
    let policyRules =
      RequestContext.currentContext?.req?.[forceReadPolicy ? 'policyReadRules' : 'policyRules'] || null;
    if (policyRules && this.idFieldName) {
      policyRules = RequestUtil.mapIdKeys(policyRules, this.idFieldName);
    }
    return policyRules;
  }

  getAuthUser(): AuthUser {
    return (RequestContext.currentContext?.req?.['user'] as AuthUser) || null;
  }

  async expireCache(resource: string, action: Action): Promise<void> {
    const cacheManager = RequestContext.currentContext?.req?.['cacheManager'];
    if (cacheManager) {
      await cacheManager.expireOnChange(resource, action);
    }
  }
}
