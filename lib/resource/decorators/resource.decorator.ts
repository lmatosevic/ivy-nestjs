import { AuthType, DeliveryMethod, Operation, Role } from '../../enums';
import {
  AUTH_KEY,
  Authorized,
  ReCaptcha,
  RECAPTCHA_KEY,
  Roles,
  ROLES_KEY
} from '../../auth';

export type ResourceConfig = Partial<Record<keyof typeof Operation, OperationConfig>>;

export type OperationConfig = {
  enabled?: boolean;
  auth?: AuthType[] | boolean;
  public?: boolean;
  roles?: Role[] | Role;
  recaptcha?: DeliveryMethod[] | boolean;
};

export function Resource(config?: ResourceConfig) {
  return (target: Function) => {
    if (!config || Object.keys(config).length === 0) {
      config = { [Operation.All]: {} };
    }

    let allConf = config[Operation.All];
    if (!allConf) {
      allConf = {};
    }
    for (const operation of Object.values(Operation).filter((o) => o !== Operation.All)) {
      const value = config[operation];
      if (!value) {
        config[operation] = allConf;
        continue;
      }
      for (const key of Object.keys(allConf)) {
        if (!value[key]) {
          value[key] = allConf[key];
        }
      }
    }

    for (const [operation, conf] of Object.entries(config)) {
      if (operation === Operation.All) {
        continue;
      }

      if (conf.enabled === false) {
        deleteOperation(target, operation);
        continue;
      }

      if (conf.public !== true) {
        authorizedOperation(target, operation, conf);
      }

      if (conf.roles) {
        roleAccessOperation(target, operation, conf);
      }

      if (conf.recaptcha) {
        recaptchaOperation(target, operation, conf);
      }
    }
  };
}

function deleteOperation(target: Function, operation: string) {
  const { descriptor } = parentAndDescriptor(target, operation);
  if (!descriptor) {
    return;
  }

  Reflect.deleteMetadata('path', descriptor.value);
  Reflect.deleteMetadata('graphql:resolver_type', descriptor.value);
}

function authorizedOperation(target: Function, operation: string, conf: OperationConfig) {
  const { parent, descriptor } = parentAndDescriptor(target, operation);
  if (!descriptor) {
    return;
  }

  const currentAuths =
    Reflect.getMetadata(AUTH_KEY, descriptor ? descriptor.value : '') || [];
  let authorize = Authorized(...currentAuths);
  if (conf.auth && Array.isArray(conf.auth)) {
    authorize = Authorized(...currentAuths, ...conf.auth);
  }
  authorize(parent, operation.toLowerCase(), descriptor);
}

function roleAccessOperation(target: Function, operation: string, conf: OperationConfig) {
  const { parent, descriptor } = parentAndDescriptor(target, operation);
  if (!descriptor) {
    return;
  }

  const currentRoles = Reflect.getMetadata(ROLES_KEY, descriptor.value) || [];
  let roles;
  if (Array.isArray(conf.roles)) {
    roles = Roles(...currentRoles, ...conf.roles);
  } else {
    roles = Roles(...currentRoles, conf.roles);
  }
  roles(parent, operation.toLowerCase(), descriptor);
}

function recaptchaOperation(target: Function, operation: string, conf: OperationConfig) {
  const { parent, descriptor } = parentAndDescriptor(target, operation);
  if (!descriptor) {
    return;
  }

  const currentDeliveries = Reflect.getMetadata(RECAPTCHA_KEY, descriptor.value) || [];
  let recaptcha;
  if (Array.isArray(conf.recaptcha)) {
    recaptcha = ReCaptcha(...currentDeliveries, ...conf.recaptcha);
  } else {
    recaptcha = ReCaptcha(...currentDeliveries);
  }
  recaptcha(parent, operation.toLowerCase(), descriptor);
}

function parentAndDescriptor(
  target: Function,
  operation: string
): { parent: any; descriptor: PropertyDescriptor } {
  const parent = target.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(parent, operation.toLowerCase());
  return { parent, descriptor };
}
