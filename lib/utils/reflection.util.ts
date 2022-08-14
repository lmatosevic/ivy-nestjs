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
}
