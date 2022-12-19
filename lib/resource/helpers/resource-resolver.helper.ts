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
import { ConfigService } from '@nestjs/config';
import { Expose } from 'class-transformer';
import { IsArray, IsOptional, Min } from 'class-validator';
import { IResourceResolver } from './resource.resolver';
import { Config } from '../../config/decorators';
import { ReflectionUtil, RequestUtil, StringUtil } from '../../utils';
import {
  AggregateOperator,
  AggregateRange,
  AggregateResult,
  AggregateResultValue,
  FilterOperator,
  StatusResponse
} from '../dto';
import { ResourceService } from '../services';
import { Resource, ResourceConfig } from '../decorators';
import { FILE_PROPS_KEY, FileFilter, FileProps } from '../../storage';
import { ResourcePolicy, ResourcePolicyInterceptor } from '../policy';

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

function DeleteFilesArgsType<T>(classRef: Type<T>, idParamType: () => Type<unknown>): any {
  abstract class DeleteFilesClass {
    protected constructor() {}
  }

  ArgsType()(DeleteFilesClass);

  Object.defineProperty(DeleteFilesClass, 'id', {});
  Field(() => idParamType(), {
    name: 'id'
  })(DeleteFilesClass.prototype, 'id');

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

function AggregateResultType<T>(classRef: Type<T>): any {
  abstract class AggregateResultClass {
    protected constructor() {}
  }

  const pluralName = StringUtil.pluralize(classRef.name);
  ObjectType(`${pluralName}AggregateResult`)(AggregateResultClass);

  const metadata = classRef['_GRAPHQL_METADATA_FACTORY']?.();
  for (const key of Object.keys(metadata || {})) {
    let type = metadata[key].type?.();
    if (['number', 'date'].includes(type?.name?.toLowerCase()) || key === '_id' || key === 'id') {
      Object.defineProperty(AggregateResultClass, key, {});
      Field(() => AggregateResultValue, { name: key === '_id' ? 'id' : undefined, nullable: true })(
        AggregateResultClass.prototype,
        key
      );
    }
  }

  return AggregateResultClass;
}

function AggregateSelectType<T>(classRef: Type<T>): any {
  abstract class AggregateSelectClass {
    protected constructor() {}
  }

  const pluralName = StringUtil.pluralize(classRef.name);
  InputType(`${pluralName}AggregateSelect`)(AggregateSelectClass);

  const metadata = classRef['_GRAPHQL_METADATA_FACTORY']?.();
  for (const key of Object.keys(metadata || {})) {
    let type = metadata[key].type?.();
    if (['number', 'date'].includes(type?.name?.toLowerCase()) || key === '_id' || key === 'id') {
      Object.defineProperty(AggregateSelectClass, key, {});
      Field(() => AggregateOperator, { name: key === '_id' ? 'id' : undefined, nullable: true })(
        AggregateSelectClass.prototype,
        key
      );
    }
  }

  return AggregateSelectClass;
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
    @Field(() => [QueryFilter], { nullable: true })
    _and?: QueryFilter[];

    @Field(() => [QueryFilter], { nullable: true })
    _or?: QueryFilter[];

    @Field(() => [QueryFilter], { nullable: true })
    _nor?: QueryFilter[];
  }

  // Required for dynamic QueryFilter type resolution in OperatorInputType function
  classRef['_GRAPHQL_QUERY_FILTER_FACTORY'] = () => QueryFilter;
  return QueryFilter;
}

export function ResourceResolver<T, C, U>(
  resourceRef: Type<T>,
  createDtoRef: Type<C>,
  updateDtoRef: Type<U>,
  config?: ResourceConfig
): Type<IResourceResolver<T, C, U>> {
  const pluralName = StringUtil.pluralize(resourceRef.name);
  const findOperationName = `${resourceRef.name.charAt(0).toLowerCase()}${resourceRef.name.substring(1)}`;
  const queryOperationName = `${pluralName.charAt(0).toLowerCase()}${pluralName.substring(1)}`;
  const aggregateOperationName = `${queryOperationName}Aggregate`;

  const fileProps = extractFileProps(resourceRef);

  const aggregateSelect = AggregateSelectType(resourceRef);
  const aggregateResult = AggregateResultType(resourceRef);
  const queryFilter = initializeFilterModel(resourceRef);

  const idParamType = () => resourceRef['_GRAPHQL_METADATA_FACTORY']?.()?.['id']?.type?.() || String;

  @ArgsType()
  class QueryOptions {
    @Min(1)
    @IsOptional()
    @Field(() => Int, { nullable: true })
    page?: number;

    @Min(0)
    @IsOptional()
    @Field(() => Int, { nullable: true })
    size?: number;

    @IsOptional()
    @Field({ nullable: true })
    sort?: string;

    @IsOptional()
    @Field(() => queryFilter, { nullable: true })
    filter?: typeof queryFilter;
  }

  @ObjectType(`${pluralName}Response`)
  class QueryResponse {
    @Field(() => Int)
    resultCount: number;

    @Field(() => Int)
    totalCount: number;

    @Field(() => [resourceRef])
    items: T[];
  }

  @ArgsType()
  class AggregateOptions {
    @IsOptional()
    @Field(() => queryFilter, { nullable: true })
    filter?: typeof queryFilter;

    @Field(() => aggregateSelect)
    select: typeof aggregateSelect;

    @IsOptional()
    @Field(() => AggregateRange, { nullable: true })
    range: AggregateRange;
  }

  @ObjectType(`${pluralName}AggregateItem`)
  class AggregateResponseItem {
    @Field(() => Date, { nullable: true })
    date: Date;

    @Field(() => aggregateResult)
    result: typeof aggregateResult;
  }

  @ObjectType(`${pluralName}AggregateResponse`)
  class AggregateResponse {
    @Field(() => aggregateResult)
    total: Partial<Record<keyof T, AggregateResultValue>> | Record<string, any>;

    @Field(() => [AggregateResponseItem])
    items: AggregateResult<T>[];
  }

  @ArgsType()
  class DeleteFilesArgs extends PartialType(DeleteFilesArgsType(resourceRef, idParamType), ArgsType) {}

  @Resource(resourceRef, config)
  @Resolver({ isAbstract: true })
  class ResourceResolver implements IResourceResolver<T, C, U> {
    private readonly protectedService: ResourceService<T>;

    constructor(protected service: ResourceService<T>, protected policy?: ResourcePolicy<any, any>) {
      this.protectedService = service.asProtected();
      if (policy) {
        UseInterceptors(new ResourcePolicyInterceptor(policy))(ResourceResolver);
      }
    }

    @Query(() => resourceRef, { name: findOperationName })
    async find(@Args('id', { type: () => idParamType() }) id: string | number): Promise<T> {
      return this.protectedService.find(id);
    }

    @Query(() => QueryResponse, { name: queryOperationName })
    async query(@Args() queryOptions: QueryOptions, @Config() config: ConfigService): Promise<QueryResponse> {
      const { filter, ...options } = queryOptions;
      return this.protectedService.query({
        filter,
        ...RequestUtil.prepareQueryParams(
          options,
          config.get('pagination.maxSize'),
          config.get('pagination.defaultSize'),
          config.get('pagination.defaultSort')
        )
      });
    }

    @Query(() => AggregateResponse, { name: aggregateOperationName })
    async aggregate(@Args() aggregateOptions: AggregateOptions): Promise<AggregateResponse> {
      return this.protectedService.aggregate(aggregateOptions);
    }

    @Mutation(() => resourceRef, { name: `create${resourceRef.name}` })
    async create(@Args('data', { type: () => createDtoRef }) createDto: C): Promise<T> {
      const instance = await RequestUtil.deserializeAndValidate(createDtoRef, createDto);
      return this.protectedService.create(instance);
    }

    @Mutation(() => resourceRef, { name: `update${resourceRef.name}` })
    async update(
      @Args('id', { type: () => idParamType() }) id: string | number,
      @Args('data', { type: () => updateDtoRef }) updateDto: U
    ): Promise<T> {
      const instance = await RequestUtil.deserializeAndValidate(updateDtoRef, updateDto);
      return this.protectedService.update(id, instance);
    }

    @Mutation(() => resourceRef, { name: `delete${resourceRef.name}` })
    async delete(@Args('id', { type: () => idParamType() }) id: string | number): Promise<T> {
      return this.protectedService.delete(id);
    }

    @Mutation(() => [resourceRef], { name: `createBulk${pluralName}` })
    async createBulk(
      @Args('data', { type: () => [createDtoRef] }) createDtos: C[],
      @Config() config: ConfigService
    ): Promise<T[]> {
      const instances = await RequestUtil.validateBulkRequest<C>(
        resourceRef.name,
        createDtos,
        createDtoRef,
        config.get('bulk.maxSize')
      );
      return this.protectedService.createBulk(instances);
    }

    @Mutation(() => [resourceRef], { name: `updateBulk${pluralName}` })
    async updateBulk(
      @Args('data', { type: () => [updateDtoRef] }) updateDtos: U[],
      @Config() config: ConfigService
    ): Promise<T[]> {
      const instances = await RequestUtil.validateBulkRequest<U>(
        resourceRef.name,
        updateDtos,
        updateDtoRef,
        config.get('bulk.maxSize')
      );
      return this.protectedService.updateBulk(instances);
    }

    @Mutation(() => [resourceRef], { name: `deleteBulk${pluralName}` })
    async deleteBulk(
      @Args('ids', { type: () => [idParamType()] }) ids: (string | number)[],
      @Config() config: ConfigService
    ): Promise<T[]> {
      const instances = await RequestUtil.validateBulkRequest<string | number>(
        resourceRef.name,
        ids,
        null,
        config.get('bulk.maxSize')
      );
      return this.protectedService.deleteBulk(instances);
    }

    @Mutation(() => StatusResponse, { name: `delete${resourceRef.name}Files` })
    async unlink(@Args() deleteFiles: DeleteFilesArgs): Promise<StatusResponse> {
      const deleteFilesInstance = await RequestUtil.deserializeAndValidate(DeleteFilesArgs, deleteFiles);
      const resource = await this.protectedService.find(deleteFiles['id']);
      delete deleteFilesInstance['id'];
      const deleteFilesRequest = RequestUtil.transformDeleteFilesRequest(resource, deleteFilesInstance);
      if (deleteFilesRequest.count === 0) {
        return { success: false, message: 'No files for deletion are provided' };
      }
      await this.protectedService.update(deleteFiles['id'], deleteFilesRequest.dto as any);
      return {
        success: true,
        message: `Deleted ${deleteFilesRequest.count} file${deleteFilesRequest.count > 1 ? 's' : ''}`
      };
    }
  }

  if (Object.keys(fileProps).length === 0) {
    ReflectionUtil.deleteResourceOperation(ResourceResolver.prototype, 'unlink');
  }

  return ResourceResolver;
}
