import { Type, UseInterceptors } from '@nestjs/common';
import {
  Args,
  ArgsType,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  PartialType,
  Query,
  Resolver
} from '@nestjs/graphql';
import pluralize from 'pluralize';
import { RequestUtil } from '../../utils';
import { FilterOperator } from '../dto';
import { ResourceService } from '../services';
import { Resource, ResourceConfig } from '../decorators';
import { FileFilter } from '../../storage';
import { ResourcePolicy, ResourcePolicyInterceptor } from '../policy';

function OperatorInputType<T>(classRef: Type<T>): any {
  abstract class OperatorValueClass {
    protected constructor() {}
  }

  const inputType = InputType();
  inputType(OperatorValueClass);

  const metadata = classRef['_GRAPHQL_METADATA_FACTORY']?.();
  for (const key of Object.keys(metadata || {})) {
    Object.defineProperty(OperatorValueClass, key, {});
    let type = metadata[key].type?.();
    type = Array.isArray(type) && type.length > 0 ? type[0] : type;
    if (type?.name === 'File') {
      Field(() => FileFilter)(OperatorValueClass.prototype, key);
    } else if (!!type?._GRAPHQL_METADATA_FACTORY) {
      Field(() => type._GRAPHQL_QUERY_FILTER_FACTORY?.())(OperatorValueClass.prototype, key);
    } else if (key === '_id') {
      Field(() => FilterOperator, { name: 'id' })(OperatorValueClass.prototype, key);
    } else {
      Field(() => FilterOperator)(OperatorValueClass.prototype, key);
    }
  }

  return OperatorValueClass;
}

export function ResourceResolver<T extends Type<unknown>, C extends Type<unknown>, U extends Type<unknown>>(
  resourceRef: T,
  createDtoRef: C,
  updateDtoRef: U,
  config?: ResourceConfig
): any {
  const pluralName = pluralize(resourceRef.name);

  @InputType(`${pluralName}Filter`)
  class QueryFilter extends PartialType(OperatorInputType(resourceRef), InputType) {
    @Field(() => QueryFilter, { nullable: true })
    _and?: QueryFilter;

    @Field(() => QueryFilter, { nullable: true })
    _or?: QueryFilter;

    @Field(() => QueryFilter, { nullable: true })
    _nor?: QueryFilter;
  }

  @ObjectType(`${pluralName}Response`)
  class QueryResponse {
    @Field(() => Int)
    resultCount?: number;

    @Field(() => Int)
    totalCount?: number;

    @Field(() => [resourceRef])
    items?: T[];
  }

  @ArgsType()
  class QueryOptions {
    @Field(() => Int, { nullable: true })
    skip?: number;

    @Field(() => Int, { nullable: true })
    limit?: number;

    @Field({ nullable: true })
    sort?: string;

    @Field(() => QueryFilter, { nullable: true })
    filter?: QueryFilter;
  }

  resourceRef['_GRAPHQL_QUERY_FILTER_FACTORY'] = () => QueryFilter;

  @Resource(config)
  @Resolver({ isAbstract: true })
  abstract class ResourceResolver {
    protected constructor(
      protected service: ResourceService<T>,
      protected policy?: ResourcePolicy<any, any>
    ) {
      if (policy) {
        UseInterceptors(new ResourcePolicyInterceptor(policy))(ResourceResolver);
      }
    }

    @Query(() => resourceRef, { name: `${resourceRef.name.toLowerCase()}` })
    async find(@Args('id') id: string): Promise<T> {
      return this.service.find(id);
    }

    @Query(() => QueryResponse, { name: `${pluralName.toLowerCase()}` })
    async query(@Args() queryOptions: QueryOptions): Promise<QueryResponse> {
      const { filter, ...options } = queryOptions;
      const query = RequestUtil.transformFilter(filter);
      return await this.service.query({
        filter: query,
        ...RequestUtil.restrictQueryLimit(options)
      });
    }

    @Mutation(() => resourceRef, { name: `create${resourceRef.name}` })
    async create(@Args('data', { type: () => createDtoRef }) createDto: C): Promise<T> {
      const instance = await RequestUtil.deserializeAndValidate(createDtoRef, createDto);
      return this.service.create(instance);
    }

    @Mutation(() => resourceRef, { name: `update${resourceRef.name}` })
    async update(
      @Args('id') id: string,
      @Args('data', { type: () => updateDtoRef }) updateDto: U
    ): Promise<T> {
      const instance = await RequestUtil.deserializeAndValidate(updateDtoRef, updateDto);
      return this.service.update(id, instance);
    }

    @Mutation(() => resourceRef, { name: `delete${resourceRef.name}` })
    async delete(@Args('id') id: string): Promise<T> {
      return this.service.delete(id);
    }
  }

  return ResourceResolver;
}
