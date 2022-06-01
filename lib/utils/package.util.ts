import { ResolverTypeMetadata } from '@nestjs/graphql/dist/schema-builder/metadata';
import { TypeMetadataStorage } from '@nestjs/graphql';

export class PackageUtil {
  static upgradeGraphQLSchemaBuilder(): void {
    TypeMetadataStorage.addMutationMetadata = (metadata: ResolverTypeMetadata) => {
      const descriptor = Object.getOwnPropertyDescriptor(metadata.target.prototype, metadata.methodName);
      const typeData = Reflect.getMetadata('graphql:resolver_type', descriptor.value);
      if (typeData) {
        TypeMetadataStorage['mutations'].push(metadata);
      }
    };

    TypeMetadataStorage.addQueryMetadata = (metadata: ResolverTypeMetadata) => {
      const descriptor = Object.getOwnPropertyDescriptor(metadata.target.prototype, metadata.methodName);
      const typeData = Reflect.getMetadata('graphql:resolver_type', descriptor.value);
      if (typeData) {
        TypeMetadataStorage['queries'].push(metadata);
      }
    };
  }
}
