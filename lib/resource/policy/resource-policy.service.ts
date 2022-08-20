import { RequestContext } from '../../context';
import { PolicyRules } from './resource-policy.interceptor';
import * as _ from 'lodash';
import { AuthUser } from '../../auth';
import { ObjectUtil } from '../../utils';

export abstract class ResourcePolicyService {
  protected constructor(private idFieldName?: string) {}

  intersectFields(object: any): any {
    const allowedFields = this.policyProjection(true, false);

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
    let policyRules =
      RequestContext.currentContext?.req?.[forceReadPolicy ? 'policyReadRules' : 'policyRules'] || null;
    if (policyRules && this.idFieldName && this.idFieldName !== 'id') {
      policyRules = ObjectUtil.transfromKeysAndValues(policyRules, (key: string) =>
        key === 'id' ? this.idFieldName : key
      );
    }
    return policyRules;
  }

  getAuthUser(): AuthUser {
    return (RequestContext.currentContext?.req?.['user'] as AuthUser) || null;
  }

  isInternalCall(): boolean {
    return !RequestContext.currentContext?.req;
  }

  isExternalCall(): boolean {
    return !this.isInternalCall();
  }
}
