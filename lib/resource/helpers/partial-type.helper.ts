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

export function PartialType<T extends Type<unknown>>(
  resourceRef: T,
  config: PartialTypeConfig = {}
): any {
  if (config.pick?.length > 0 && config.omit?.length > 0) {
    throw new Error(
      `Cannot use both pick and omit types at the same time for partial schema type`
    );
  }

  let gqlType;
  let swaggerType;
  if (config.pick?.length > 0) {
    gqlType = PickType(resourceRef, config.pick as never);
    swaggerType = SwaggerPickType(resourceRef, config.pick as never);
  } else if (config.omit?.length > 0) {
    gqlType = OmitType(resourceRef, config.omit as never);
    swaggerType = SwaggerOmitType(resourceRef, config.omit as never);
  } else {
    gqlType = swaggerType = resourceRef;
  }

  const classType = config.keepRequired ? gqlType : GqlPartialType(gqlType);
  const swaggerClassType = config.keepRequired
    ? swaggerType
    : SwaggerPartialType(swaggerType);

  classType['_OPENAPI_METADATA_FACTORY'] = swaggerClassType['_OPENAPI_METADATA_FACTORY'];

  return classType;
}
