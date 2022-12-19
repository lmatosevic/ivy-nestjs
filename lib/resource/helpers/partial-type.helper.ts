import { OmitType, PartialType as GqlPartialType, PickType } from '@nestjs/graphql';
import {
  OmitType as SwaggerOmitType,
  PartialType as SwaggerPartialType,
  PickType as SwaggerPickType
} from '@nestjs/swagger';
import { Type } from '@nestjs/common';
import { PartialDeep } from 'type-fest';

export interface PartialTypeConfig {
  readonly pick?: string[];
  readonly omit?: string[];
  readonly keepRequired?: boolean;
}

export function PartialType<T>(resourceRef: Type<T>, config: PartialTypeConfig = {}): Type<PartialDeep<T>> {
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

  if ((!graphqlEnabled && restEnabled) || (!graphqlEnabled && !restEnabled)) {
    return config.keepRequired ? swaggerType || resourceRef : SwaggerPartialType(swaggerType || resourceRef);
  }

  const classType = config.keepRequired ? gqlType : GqlPartialType(gqlType);
  const swaggerClassType = config.keepRequired ? swaggerType : SwaggerPartialType(swaggerType);

  classType['_OPENAPI_METADATA_FACTORY'] = swaggerClassType['_OPENAPI_METADATA_FACTORY'];

  return classType;
}
