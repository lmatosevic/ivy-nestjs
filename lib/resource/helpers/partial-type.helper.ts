import { OmitType, PickType, PartialType as GqlPartialType } from '@nestjs/graphql';
import {
  PartialType as SwaggerPartialType,
  OmitType as SwaggerOmitType,
  PickType as SwaggerPickType
} from '@nestjs/swagger';
import { Type } from '@nestjs/common';

export interface PartialTypeConfig {
  readonly pick?: string[];
  readonly omit?: string[];
  readonly keepRequired?: boolean;
}

export function PartialType<T extends Type<unknown>>(resourceRef: T, config: PartialTypeConfig = {}): any {
  if (config.pick?.length > 0 && config.omit?.length > 0) {
    throw new Error(`Cannot use both pick and omit types at the same time for partial schema type`);
  }

  const restEnabled = !!resourceRef['_OPENAPI_METADATA_FACTORY'];
  const graphqlEnabled = !!resourceRef['_GRAPHQL_METADATA_FACTORY'];

  let gqlType;
  let swaggerType;
  if (config.pick?.length > 0) {
    if (graphqlEnabled) {
      gqlType = PickType(resourceRef, config.pick as never);
    }
    if (restEnabled) {
      swaggerType = SwaggerPickType(resourceRef, config.pick as never);
    }
  } else if (config.omit?.length > 0) {
    if (graphqlEnabled) {
      gqlType = OmitType(resourceRef, config.omit as never);
    }
    if (restEnabled) {
      swaggerType = SwaggerOmitType(resourceRef, config.omit as never);
    }
  } else {
    gqlType = swaggerType = resourceRef;
  }

  if (graphqlEnabled && !restEnabled) {
    return config.keepRequired ? gqlType : GqlPartialType(gqlType);
  }

  if (!graphqlEnabled && restEnabled) {
    return config.keepRequired ? swaggerType : SwaggerPartialType(swaggerType);
  }

  const classType = config.keepRequired ? gqlType : GqlPartialType(gqlType);
  const swaggerClassType = config.keepRequired ? swaggerType : SwaggerPartialType(swaggerType);

  classType['_OPENAPI_METADATA_FACTORY'] = swaggerClassType['_OPENAPI_METADATA_FACTORY'];

  return classType;
}
