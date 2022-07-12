import { Type, UseInterceptors } from '@nestjs/common';
import {
  Args,
  ArgsType,
  Field,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  PartialType,
  Query,
  Resolver
} from '@nestjs/graphql';
import { RequestUtil, StringUtil } from '../../utils';
import { FilterOperator, StatusResponse } from '../dto';
import { ResourceService } from '../services';
import { Resource, ResourceConfig } from '../decorators';
import { FILE_PROPS_KEY, FileFilter, FileProps } from '../../storage';
import { ResourcePolicy, ResourcePolicyInterceptor } from '../policy';
import { Expose } from 'class-transformer';
import { IsArray, IsOptional, Min } from 'class-validator';

function extractFileProps<T>(classRef: Type<T>): Record<string, FileProps> {
  const types = {};
  const metadata = classRef['_GRAPHQL_METADATA_FACTORY']?.();
  for (const fileName of Object.keys(metadata || {})) {
    const fileProps = Reflect.getMetadata(FILE_PROPS_KEY, classRef.prototype);
    if (fileProps && fileProps[fileName]) {
      types[fileName] = fileProps[fileName];
    }
  }
  return types;
}

function DeleteFilesArgsType<T>(classRef: Type<T>): any {
  abstract class DeleteFilesClass {
    protected constructor() {}
  }

  ArgsType()(DeleteFilesClass);

  Object.defineProperty(DeleteFilesClass, 'id', {});
  Field(() => ID, { name: 'id' })(DeleteFilesClass.prototype, 'id');

  const filePropsMap = extractFileProps(classRef);
  for (const [name, value] of Object.entries(filePropsMap)) {
    Object.defineProperty(DeleteFilesClass, name, {});
    Field(() => (value.isArray ? [String] : String), { nullable: true })(DeleteFilesClass.prototype, name);
    Expose()(DeleteFilesClass.prototype, name);
    IsOptional()(DeleteFilesClass.prototype, name);
    if (value.isArray) {
      IsArray()(DeleteFilesClass.prototype, name);
    }
  }

  return DeleteFilesClass;
}

function OperatorInputType<T>(classRef: Type<T>): any {
  abstract class OperatorValueClass {
    protected constructor() {}
  }

  InputType()(OperatorValueClass);

  const metadata = classRef['_GRAPHQL_METADATA_FACTORY']?.();
  for (const key of Object.keys(metadata || {})) {
    Object.defineProperty(OperatorValueClass, key, {});
    let type = metadata[key].type?.();
    type = Array.isArray(type) && type.length > 0 ? type[0] : type;
    if (type?.name === 'File') {
      Field(() => FileFilter)(OperatorValueClass.prototype, key);
    } else if (!!type?._GRAPHQL_METADATA_FACTORY) {
      if (!type._GRAPHQL_QUERY_INITIALIZED) {
        initializeFilterModel(type);
      }
      Field(() => type._GRAPHQL_QUERY_FILTER_FACTORY?.())(OperatorValueClass.prototype, key);
    } else if (key === '_id' || key === 'id') {
      Field(() => FilterOperator, { name: 'id' })(OperatorValueClass.prototype, key);
    } else {
      Field(() => FilterOperator)(OperatorValueClass.prototype, key);
    }
  }

  return OperatorValueClass;
}

function initializeFilterModel(classRef: Type<unknown>): any {
  if (classRef['_GRAPHQL_QUERY_INITIALIZED']) {
    return classRef['_GRAPHQL_QUERY_FILTER_FACTORY']?.();
  }
  classRef['_GRAPHQL_QUERY_INITIALIZED'] = true;
  const pluralName = StringUtil.pluralize(classRef.name);

  @InputType(`${pluralName}Filter`)
  class QueryFilter extends PartialType(OperatorInputType(classRef), InputType) {
    @Field(() => QueryFilter, { nullable: true })
    _and?: QueryFilter;

    @Field(() => QueryFilter, { nullable: true })
    _or?: QueryFilter;

    @Field(() => QueryFilter, { nullable: true })
    _nor?: QueryFilter;
  }

  // Required for dynamic QueryFilter type resolution in OperatorInputType function
  classRef['_GRAPHQL_QUERY_FILTER_FACTORY'] = () => QueryFilter;
  return QueryFilter;
}

export function ResourceResolver<T extends Type<unknown>, C extends Type<unknown>, U extends Type<unknown>>(
  resourceRef: T,
  createDtoRef: C,
  updateDtoRef: U,
  config?: ResourceConfig
): any {
  const pluralName = StringUtil.pluralize(resourceRef.name);
  const fileProps = extractFileProps(resourceRef);

  const queryFilter = initializeFilterModel(resourceRef);

  @ArgsType()
  class QueryOptions {
    @Min(1)
    @Field(() => Int, { nullable: true })
    page?: number;

    @Min(0)
    @Field(() => Int, { nullable: true })
    size?: number;

    @Field({ nullable: true })
    sort?: string;

    @Field(() => queryFilter, { nullable: true })
    filter?: typeof queryFilter;
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
  class DeleteFilesArgs extends PartialType(DeleteFilesArgsType(resourceRef), ArgsType) {}

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
    async find(@Args('id', { type: () => ID }) id: string | number): Promise<T> {
      return this.service.find(id);
    }

    @Query(() => QueryResponse, { name: `${pluralName.toLowerCase()}` })
    async query(@Args() queryOptions: QueryOptions): Promise<QueryResponse> {
      const { filter, ...options } = queryOptions;
      const query = RequestUtil.transformFilter(filter);
      return await this.service.query({
        filter: query,
        ...RequestUtil.restrictQueryPageSize(options)
      });
    }

    @Mutation(() => resourceRef, { name: `create${resourceRef.name}` })
    async create(@Args('data', { type: () => createDtoRef }) createDto: C): Promise<T> {
      const instance = await RequestUtil.deserializeAndValidate(createDtoRef, createDto);
      return this.service.create(instance);
    }

    @Mutation(() => resourceRef, { name: `update${resourceRef.name}` })
    async update(
      @Args('id', { type: () => ID }) id: string | number,
      @Args('data', { type: () => updateDtoRef }) updateDto: U
    ): Promise<T> {
      const instance = await RequestUtil.deserializeAndValidate(updateDtoRef, updateDto);
      return this.service.update(id, instance);
    }

    @Mutation(() => resourceRef, { name: `delete${resourceRef.name}` })
    async delete(@Args('id', { type: () => ID }) id: string | number): Promise<T> {
      return this.service.delete(id);
    }

    @Mutation(() => StatusResponse, { name: `delete${resourceRef.name}Files` })
    async unlink(@Args() deleteFiles: DeleteFilesArgs): Promise<StatusResponse> {
      const deleteFilesInstance = await RequestUtil.deserializeAndValidate(DeleteFilesArgs, deleteFiles);
      const resource = await this.service.find(deleteFiles['id']);
      delete deleteFilesInstance['id'];
      const deleteFilesRequest = RequestUtil.transformDeleteFilesRequest(resource, deleteFilesInstance);
      if (deleteFilesRequest.count === 0) {
        return { success: false, message: 'No files for deletion are provided' };
      }
      await this.service.update(deleteFiles['id'], deleteFilesRequest.dto as any);
      return {
        success: true,
        message: `Deleted ${deleteFilesRequest.count} file${deleteFilesRequest.count > 1 ? 's' : ''}`
      };
    }
  }

  if (Object.keys(fileProps).length === 0) {
    const descriptor = Object.getOwnPropertyDescriptor(ResourceResolver.prototype, 'unlink');
    Reflect.deleteMetadata('graphql:resolver_type', descriptor.value);
  }

  return ResourceResolver;
}
