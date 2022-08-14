import { AuthRouteOptions, RECAPTCHA_KEY } from '../auth';

export class ReflectionUtil {
  static deleteMetadata(prototype: any, name: string, metadataKey: string): boolean {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    return descriptor ? Reflect.deleteMetadata(metadataKey, descriptor.value) : false;
  }

  static deleteResourceOperation(prototype: any, name: string): boolean {
    return (
      this.deleteMetadata(prototype, name, 'path') ||
      this.deleteMetadata(prototype, name, 'graphql:resolver_type')
    );
  }

  static updateAuthRoutes(prototype: any, routeConfig: Record<string, AuthRouteOptions>): void {
    for (const [name, config] of Object.entries(routeConfig)) {
      if (config.enabled === false) {
        ReflectionUtil.deleteResourceOperation(prototype, name);
      }
      if (config.recaptcha === false) {
        ReflectionUtil.deleteMetadata(prototype, name, RECAPTCHA_KEY);
      }
    }
  }
}
