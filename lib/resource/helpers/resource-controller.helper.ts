import {
  Body,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Type,
  UploadedFiles,
  UseInterceptors
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiProperty,
  ApiTags,
  getSchemaPath,
  PartialType
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Expose } from 'class-transformer';
import { IsArray, IsOptional } from 'class-validator';
import { IResourceController } from './resource.controller';
import { Config } from '../../config/decorators';
import { FilesUtil, ReflectionUtil, RequestUtil, StringUtil } from '../../utils';
import { FILE_PROPS_KEY, FileDto, FileFilter, FileProps } from '../../storage';
import {
  AggregateOperator,
  AggregateRequest,
  AggregateResponse,
  AggregateResult,
  AggregateResultValue,
  ErrorResponse,
  FilterOperator,
  QueryRequest,
  QueryResponse,
  StatusResponse
} from '../dto';
import { ResourceService } from '../services';
import { Resource, ResourceConfig } from '../decorators';
import { ResourcePolicy, ResourcePolicyInterceptor } from '../policy';
import { ApiQuery } from '@nestjs/swagger';

function extractFileProps<T>(classRef: Type<T>): Record<string, FileProps> {
  const types = {};
  const metadata = classRef['_OPENAPI_METADATA_FACTORY']?.();
  for (const fileName of Object.keys(metadata || {})) {
    const fileProps = Reflect.getMetadata(FILE_PROPS_KEY, classRef.prototype);
    if (fileProps && fileProps[fileName]) {
      types[fileName] = fileProps[fileName];
    }
  }
  return types;
}

function FilesDtoType<T>(classRef: Type<T>): any {
  abstract class FilesDtoClass {
    protected constructor() {}
  }

  const filePropsMap = extractFileProps(classRef);
  for (const [name, value] of Object.entries(filePropsMap)) {
    Object.defineProperty(FilesDtoClass, name, {});
    ApiProperty(
      !value.isArray
        ? {
            type: 'string',
            format: 'binary',
            required: false
          }
        : {
            type: 'array',
            required: false,
            items: {
              type: 'string',
              format: 'binary'
            }
          }
    )(FilesDtoClass.prototype, name);
  }

  return FilesDtoClass;
}

function DeleteFilesDtoType<T>(classRef: Type<T>): any {
  abstract class DeleteFilesDtoClass {
    protected constructor() {}
  }

  const filePropsMap = extractFileProps(classRef);
  for (const [name, value] of Object.entries(filePropsMap)) {
    Object.defineProperty(DeleteFilesDtoClass, name, {});
    ApiProperty(
      value.isArray
        ? {
            type: 'array',
            required: false,
            items: {
              type: 'string'
            }
          }
        : {
            type: 'string',
            required: false
          }
    )(DeleteFilesDtoClass.prototype, name);
    Expose()(DeleteFilesDtoClass.prototype, name);
    IsOptional()(DeleteFilesDtoClass.prototype, name);
    if (value.isArray) {
      IsArray()(DeleteFilesDtoClass.prototype, name);
    }
  }

  return DeleteFilesDtoClass;
}

function AggregateResultType<T>(classRef: Type<T>): any {
  abstract class AggregateResultClass {
    protected constructor() {}
  }

  const metadata = classRef['_OPENAPI_METADATA_FACTORY']?.();
  for (const key of Object.keys(metadata || {})) {
    let type = metadata[key].type?.();
    if (['number', 'date'].includes(type?.name?.toLowerCase()) || key === '_id' || key === 'id') {
      Object.defineProperty(AggregateResultClass, key, {});
      ApiProperty({
        type: () => AggregateResultValue,
        required: false,
        name: key === '_id' ? 'id' : undefined
      })(AggregateResultClass.prototype, key);
    }
  }

  return AggregateResultClass;
}

function AggregateSelectType<T>(classRef: Type<T>): any {
  abstract class AggregateSelectClass {
    protected constructor() {}
  }

  const metadata = classRef['_OPENAPI_METADATA_FACTORY']?.();
  for (const key of Object.keys(metadata || {})) {
    let type = metadata[key].type?.();
    if (['number', 'date'].includes(type?.name?.toLowerCase()) || key === '_id' || key === 'id') {
      Object.defineProperty(AggregateSelectClass, key, {});
      ApiProperty({
        type: () => AggregateOperator,
        required: false,
        name: key === '_id' ? 'id' : undefined
      })(AggregateSelectClass.prototype, key);
    }
  }

  return AggregateSelectClass;
}

function OperatorInputType<T>(classRef: Type<T>): any {
  abstract class OperatorValueClass {
    protected constructor() {}
  }

  const metadata = classRef['_OPENAPI_METADATA_FACTORY']?.();
  for (const key of Object.keys(metadata || {})) {
    Object.defineProperty(OperatorValueClass, key, {});
    let type = metadata[key].type?.();
    type = Array.isArray(type) && type.length > 0 ? type[0] : type;
    if (type?.name === 'File') {
      ApiProperty({ type: () => FileFilter, required: false })(OperatorValueClass.prototype, key);
    } else if (!!type?._OPENAPI_METADATA_FACTORY) {
      if (!type._OPENAPI_QUERY_INITIALIZED) {
        initializeFilterModel(type);
      }
      ApiProperty({ type: () => type._OPENAPI_QUERY_FILTER_FACTORY?.() })(OperatorValueClass.prototype, key);
    } else if (key === '_id' || key === 'id') {
      ApiProperty({ type: () => FilterOperator, required: false, name: 'id' })(OperatorValueClass.prototype, key);
    } else {
      ApiProperty({ type: () => FilterOperator, required: false })(OperatorValueClass.prototype, key);
    }
  }

  return OperatorValueClass;
}

function initializeFilterModel(classRef: Type<unknown>): any {
  if (classRef['_OPENAPI_QUERY_INITIALIZED']) {
    return classRef['_OPENAPI_QUERY_FILTER_FACTORY']?.();
  }
  classRef['_OPENAPI_QUERY_INITIALIZED'] = true;
  const pluralName = StringUtil.pluralize(classRef.name);
  const queryFilterProxy = {
    [`${pluralName}Filter`]: class extends PartialType(OperatorInputType(classRef)) {}
  };
  const queryFilter = queryFilterProxy[`${pluralName}Filter`];

  const field = ApiProperty({
    type: () => [queryFilter],
    required: false
  });

  Object.defineProperty(queryFilter, '_and', {});
  field(queryFilter.prototype, '_and');

  Object.defineProperty(queryFilter, '_or', {});
  field(queryFilter.prototype, '_or');

  Object.defineProperty(queryFilter, '_nor', {});
  field(queryFilter.prototype, '_nor');

  // Required for dynamic QueryFilter type resolution in OperatorInputType function
  classRef['_OPENAPI_QUERY_FILTER_FACTORY'] = () => queryFilter;
  return queryFilter;
}

export function ResourceController<T, C, U>(
  resourceRef: Type<T>,
  createDtoRef: Type<C>,
  updateDtoRef: Type<U>,
  config?: ResourceConfig
): Type<IResourceController<T, C, U>> {
  const pluralName = StringUtil.pluralize(resourceRef.name);

  const updateDtoProxy = {
    [updateDtoRef.name]: updateDtoRef
  };

  const filesDtoProxy = {
    [`${pluralName}Files`]: class extends PartialType(FilesDtoType(resourceRef)) {}
  };
  const filesDto = filesDtoProxy[`${pluralName}Files`];
  const filePropsMap = extractFileProps(resourceRef);
  const fileTypesMulterArray = Object.entries(filePropsMap).map(([name, value]) => ({
    name,
    maxCount: !value.isArray ? 1 : undefined
  }));
  const filesResponseProperties = Object.entries(filePropsMap)
    .map(([key, val]) => ({
      key,
      value: !val.isArray
        ? { $ref: getSchemaPath(FileDto) }
        : {
            type: 'array',
            items: { $ref: getSchemaPath(FileDto) }
          }
    }))
    .reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

  const deleteFilesDtoProxy = {
    [`${pluralName}DeleteFiles`]: class extends PartialType(DeleteFilesDtoType(resourceRef)) {}
  };
  const deleteFilesDto = deleteFilesDtoProxy[`${pluralName}DeleteFiles`];

  const aggregateSelectDtoProxy = {
    [`${pluralName}AggregateSelect`]: class extends PartialType(AggregateSelectType(resourceRef)) {}
  };
  const aggregateSelect = aggregateSelectDtoProxy[`${pluralName}AggregateSelect`];

  const aggregateResultDtoProxy = {
    [`${pluralName}AggregateResult`]: class extends PartialType(AggregateResultType(resourceRef)) {}
  };
  const aggregateResult = aggregateResultDtoProxy[`${pluralName}AggregateResult`];

  const queryFilter = initializeFilterModel(resourceRef);

  const idParamType = () => resourceRef['_OPENAPI_METADATA_FACTORY']?.()?.['id']?.type?.() || String;
  const idValidationPipes = () => (idParamType() === String ? [] : [ParseIntPipe]);

  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    type: ErrorResponse
  })
  @ApiExtraModels(
    QueryResponse,
    QueryRequest,
    AggregateRequest,
    AggregateResponse,
    AggregateResult,
    queryFilter,
    aggregateSelect,
    aggregateResult,
    resourceRef
  )
  @ApiTags(pluralName)
  @Resource(resourceRef, config)
  class ResourceController implements IResourceController<T, C, U> {
    private readonly protectedService: ResourceService<T>;

    constructor(
      protected service: ResourceService<T>,
      protected policy?: ResourcePolicy<any, any>
    ) {
      this.protectedService = service.asProtected();
      if (policy) {
        UseInterceptors(new ResourcePolicyInterceptor(policy))(ResourceController);
      }
    }

    @ApiOkResponse({ type: () => resourceRef })
    @ApiNotFoundResponse({
      description: `${resourceRef.name} not found`,
      type: ErrorResponse
    })
    @ApiParam({ name: 'id', type: () => idParamType() })
    @HttpCode(200)
    @Get('/:id')
    find(@Param('id', ...idValidationPipes()) id: string | number): Promise<T> {
      return this.protectedService.find(id);
    }

    @ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(QueryResponse) },
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(resourceRef) }
              }
            }
          }
        ]
      }
    })
    @ApiQuery({ name: 'sort', required: false })
    @ApiQuery({ name: 'filter', required: false })
    @ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponse })
    @HttpCode(200)
    @Get('')
    queryGet(
      @Config() config: ConfigService,
      @Query('sort') sortParam?: string,
      @Query('filter') filterParam?: string,
      @Query() queryDto?: QueryRequest<T>
    ): Promise<QueryResponse<T>> {
      const { page, size, sort, ...queryParams } = queryDto;
      const filter = RequestUtil.transformQueryParamsToObject(queryParams);
      return this.protectedService.query({
        filter,
        ...RequestUtil.prepareQueryParams(
          { page, size, sort },
          config.get('pagination.maxSize'),
          config.get('pagination.defaultSize'),
          config.get('pagination.defaultSort')
        )
      });
    }

    @ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(QueryResponse) },
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(resourceRef) }
              }
            }
          }
        ]
      }
    })
    @ApiBody({
      schema: {
        allOf: [
          { $ref: getSchemaPath(QueryRequest) },
          {
            properties: {
              filter: {
                $ref: getSchemaPath(queryFilter)
              }
            }
          }
        ]
      }
    })
    @ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponse })
    @HttpCode(200)
    @Post('/query')
    query(@Body() queryDto: QueryRequest<T>, @Config() config: ConfigService): Promise<QueryResponse<T>> {
      const { filter, ...options } = queryDto;
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

    @ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(AggregateResponse) },
          {
            properties: {
              total: {
                $ref: getSchemaPath(aggregateResult)
              },
              items: {
                type: 'array',
                items: {
                  allOf: [
                    { $ref: getSchemaPath(AggregateResult) },
                    {
                      properties: {
                        result: {
                          $ref: getSchemaPath(aggregateResult)
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        ]
      }
    })
    @ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponse })
    @HttpCode(200)
    @Get('/aggregate')
    async aggregateGet(@Query() aggregateParams: Record<string, any>): Promise<AggregateResponse<T>> {
      const aggregateDto = RequestUtil.transformQueryParamsToObject(aggregateParams);
      return this.protectedService.aggregate(aggregateDto);
    }

    @ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(AggregateResponse) },
          {
            properties: {
              total: {
                $ref: getSchemaPath(aggregateResult)
              },
              items: {
                type: 'array',
                items: {
                  allOf: [
                    { $ref: getSchemaPath(AggregateResult) },
                    {
                      properties: {
                        result: {
                          $ref: getSchemaPath(aggregateResult)
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        ]
      }
    })
    @ApiBody({
      schema: {
        allOf: [
          { $ref: getSchemaPath(AggregateRequest) },
          {
            properties: {
              filter: {
                $ref: getSchemaPath(queryFilter)
              },
              select: {
                $ref: getSchemaPath(aggregateSelect)
              }
            }
          }
        ]
      }
    })
    @ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponse })
    @HttpCode(200)
    @Post('/aggregate')
    async aggregate(@Body() aggregateDto: AggregateRequest<T>): Promise<AggregateResponse<T>> {
      return this.protectedService.aggregate(aggregateDto);
    }

    @ApiBody({ type: createDtoRef })
    @ApiCreatedResponse({ type: () => resourceRef, status: 201 })
    @ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponse })
    @HttpCode(201)
    @Post()
    async create(@Body() createDto: C): Promise<T> {
      const instance = await RequestUtil.deserializeAndValidate(createDtoRef, createDto);
      return this.protectedService.create(instance);
    }

    @ApiBody({ type: updateDtoProxy[updateDtoRef.name] })
    @ApiOkResponse({ type: () => resourceRef })
    @ApiNotFoundResponse({
      description: `${resourceRef.name} not found`,
      type: ErrorResponse
    })
    @ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponse })
    @ApiParam({ name: 'id', type: () => idParamType() })
    @HttpCode(200)
    @Put('/:id')
    async update(@Param('id', ...idValidationPipes()) id: string, @Body() updateDto: U): Promise<T> {
      const instance = await RequestUtil.deserializeAndValidate(updateDtoRef, updateDto);
      return this.protectedService.update(id, instance);
    }

    @ApiOkResponse({ type: () => resourceRef })
    @ApiNotFoundResponse({
      description: `${resourceRef.name} not found`,
      type: ErrorResponse
    })
    @ApiParam({ name: 'id', type: () => idParamType() })
    @HttpCode(200)
    @Delete('/:id')
    async delete(@Param('id', ...idValidationPipes()) id: string | number): Promise<T> {
      return this.protectedService.delete(id);
    }

    @ApiBody({ type: [createDtoRef] })
    @ApiCreatedResponse({ type: () => resourceRef, isArray: true, status: 201 })
    @ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponse })
    @HttpCode(201)
    @Post('/bulk/create')
    async createBulk(@Body() createDtos: C[], @Config() config: ConfigService): Promise<T[]> {
      const instances = await RequestUtil.validateBulkRequest<C>(
        resourceRef.name,
        createDtos,
        createDtoRef,
        config.get('bulk.maxSize')
      );
      return this.protectedService.createBulk(instances);
    }

    @ApiBody({ type: [updateDtoProxy[updateDtoRef.name]] })
    @ApiOkResponse({ type: () => resourceRef, isArray: true })
    @ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponse })
    @HttpCode(200)
    @Put('/bulk/update')
    async updateBulk(@Body() updateDtos: U[], @Config() config: ConfigService): Promise<T[]> {
      const instances = await RequestUtil.validateBulkRequest<U>(
        resourceRef.name,
        updateDtos,
        updateDtoRef,
        config.get('bulk.maxSize')
      );
      return this.protectedService.updateBulk(instances);
    }

    @ApiBody({ type: [idParamType()] })
    @ApiOkResponse({ type: () => resourceRef, isArray: true })
    @HttpCode(200)
    @Post('/bulk/delete')
    async deleteBulk(@Body() ids: (string | number)[], @Config() config: ConfigService): Promise<T[]> {
      const instances = await RequestUtil.validateBulkRequest<string | number>(
        resourceRef.name,
        ids,
        null,
        config.get('bulk.maxSize')
      );
      return this.protectedService.deleteBulk(instances);
    }

    @ApiOkResponse({
      schema: {
        properties: filesResponseProperties
      }
    })
    @ApiBody(
      fileTypesMulterArray.length > 0
        ? {
            description: 'Files binary content',
            type: filesDto
          }
        : {}
    )
    @ApiConsumes('multipart/form-data')
    @ApiNotFoundResponse({
      description: `${resourceRef.name} not found`,
      type: ErrorResponse
    })
    @ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponse })
    @UseInterceptors(FileFieldsInterceptor(fileTypesMulterArray))
    @ApiExtraModels(FileDto)
    @ApiParam({ name: 'id', type: () => idParamType() })
    @HttpCode(201)
    @Post('/:id/files')
    async upload(
      @Param('id', ...idValidationPipes()) id: string | number,
      @UploadedFiles() files: Record<string, Express.Multer.File[]>
    ): Promise<Record<string, string | string[]>> {
      try {
        const updateDto = FilesUtil.createFilesUpdateDto(files, filePropsMap);
        const instance = await RequestUtil.deserializeAndValidate(updateDtoRef, updateDto);
        const updated = await this.protectedService.update(id, instance, true);
        return FilesUtil.createFilesResponseDto(files, updated);
      } catch (e) {
        throw e;
      } finally {
        await FilesUtil.removeTemporaryFiles(files);
      }
    }

    @ApiOkResponse({ type: () => StatusResponse })
    @ApiBody(fileTypesMulterArray.length > 0 ? { type: deleteFilesDto } : {})
    @ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponse })
    @ApiExtraModels(StatusResponse)
    @ApiParam({ name: 'id', type: () => idParamType() })
    @HttpCode(200)
    @Post('/:id/delete-files')
    async unlink(
      @Param('id', ...idValidationPipes()) id: string | number,
      @Body() deleteDto: Record<string, string | string[]>
    ): Promise<StatusResponse> {
      const deleteFilesInstance = await RequestUtil.deserializeAndValidate(deleteFilesDto, deleteDto);
      const resource = await this.protectedService.find(id);
      const deleteFilesRequest = RequestUtil.transformDeleteFilesRequest(resource, deleteFilesInstance);
      if (deleteFilesRequest.count === 0) {
        return { success: false, message: 'No files for deletion are provided' };
      }
      await this.protectedService.update(id, deleteFilesRequest.dto as any);
      return {
        success: true,
        message: `Deleted ${deleteFilesRequest.count} file${deleteFilesRequest.count > 1 ? 's' : ''}`
      };
    }
  }

  if (fileTypesMulterArray.length === 0) {
    ReflectionUtil.deleteResourceOperation(ResourceController.prototype, 'upload');
    ReflectionUtil.deleteResourceOperation(ResourceController.prototype, 'unlink');
  }

  return ResourceController;
}
