import { RequestContext } from '../../context';
import { PolicyRules } from './resource-policy.interceptor';
import * as _ from 'lodash';
import { AuthUser } from '../../auth';

export abstract class ResourcePolicyService {
  intersectFields(object: any): any {
    const allowedFields = this.policyProjection();

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

  policyFilter(): any {
    const policyRules = this.getPolicyRules();
    if (!policyRules || Object.keys(policyRules).length === 0) {
      return {};
    }
    return policyRules.filter;
  }

  policyProjection(excludeSubFields = true): any {
    const policyRules = this.getPolicyRules();
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

  getPolicyRules(): PolicyRules {
    return RequestContext.currentContext?.req?.['policyRules'] || null;
  }

  getAuthUser(): AuthUser {
    return (RequestContext.currentContext?.req?.['user'] as AuthUser) || null;
  }
}
