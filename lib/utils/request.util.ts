import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { PartialDeep } from 'type-fest';
import { QueryRequest, ResourceError } from '../resource';
import { FileDto } from '../storage';
import * as _ from 'lodash';

type QueryOptions = Omit<QueryRequest<any>, 'filter'>;

export class RequestUtil {
  static prepareQueryParams(
    options: QueryOptions,
    maxSize: number = 2000,
    defaultSize?: number,
    defaultSort?: string
  ): QueryOptions {
    if (Math.abs(options?.size) > maxSize || !options?.size) {
      if (!options && defaultSize) {
        options = { size: defaultSize };
      } else if (options && (options.size === null || options.size === undefined) && defaultSize) {
        options.size = defaultSize;
      } else {
        const sign = Math.sign(options?.size);
        options.size = sign !== 0 && !isNaN(sign) ? sign * maxSize : maxSize;
      }
    }

    if (!options?.sort && defaultSort) {
      if (!options) {
        options = {};
      }
      options.sort = defaultSort;
    }
    return options;
  }

  static async deserializeAndValidate<T>(type: Type<T>, dataDto: T): Promise<PartialDeep<T> | any> {
    const instance = plainToInstance(type, dataDto, {
      excludeExtraneousValues: true,
      exposeUnsetFields: false
    });

    try {
      await validateOrReject(instance as Object, {
        validationError: { target: false },
        forbidUnknownValues: true,
        whitelist: true
      });
    } catch (e) {
      throw new ResourceError(type.name, {
        message: 'Bad request',
        reason: e,
        status: 400
      });
    }

    return instance;
  }

  static mapIdKeys(filter: any, newIdKey: string, oldIdKey: string = 'id'): any {
    if (newIdKey === oldIdKey) {
      return { ...filter };
    }
    return _.transform(
      filter,
      (result, value, key) => {
        const newKey = key === oldIdKey ? newIdKey : key;
        if (_.isPlainObject(value)) {
          result[newKey] = this.mapIdKeys(value, newIdKey);
        } else if (Array.isArray(value) && value.length > 0) {
          for (let i = 0; i < value.length; i++) {
            if (typeof value[i] === 'object') {
              value[i] = this.mapIdKeys(value[i], newIdKey);
            }
          }
          result[newKey] = value;
        } else {
          result[newKey] = value;
        }
      },
      {}
    );
  }

  static normalizeSort(sort: any): any {
    const sortMap = {};
    if (!sort || typeof sort !== 'string') {
      return sort;
    }
    const parts = sort.split(',');
    for (const part of parts) {
      let value = part.trim();
      const order = value.charAt(0) === '-' ? 'desc' : 'asc';
      value = value.charAt(0) === '-' || value.charAt(0) === '+' ? value.substring(1) : value;
      _.set(sortMap, value, order);
    }
    return sortMap;
  }

  static transformQueryParamsToObject(params: Record<string, any>): any {
    const filter = {};
    for (const [param, value] of Object.entries(params || {})) {
      _.set(filter, param, value);
    }
    return filter;
  }

  static async validateBulkRequest<T>(
    name: string,
    data: any[],
    dtoRef?: Type<unknown>,
    maxSize: number = 100
  ): Promise<(PartialDeep<T> | any)[]> {
    if (!data || !Array.isArray(data)) {
      return;
    }

    if (data.length === 0) {
      throw new ResourceError(name, {
        message: 'Bad request',
        reason: `Bulk array is empty`,
        status: 400
      });
    } else if (data.length > maxSize) {
      throw new ResourceError(name, {
        message: 'Bad request',
        reason: `Bulk array length (${data.length}) exceeds max size of ${maxSize} items`,
        status: 400
      });
    }

    if (!dtoRef) {
      return data;
    }

    const validated = [];

    for (const item of data) {
      validated.push(await this.deserializeAndValidate(dtoRef, item));
    }

    return validated;
  }

  static transformDeleteFilesRequest(
    resource: any,
    deleteFilesRequest: any
  ): { dto: Record<string, FileDto | FileDto[]>; count: number } {
    const deleteFilesDto = {};
    let deleteCount = 0;
    for (const [field, fileName] of Object.entries(deleteFilesRequest)) {
      const currentValue = resource[field];
      if (fileName && Array.isArray(fileName)) {
        deleteFilesDto[field] = _.cloneDeep(currentValue as FileDto[]);
        for (const name of fileName) {
          const exists = (currentValue as FileDto[]).find((f) => f.data === name) !== undefined;
          const fileIndex = (deleteFilesDto[field] as FileDto[]).findIndex((f) => f.data === name);
          if (!exists || fileIndex === -1) {
            throw new ResourceError(resource.name, {
              message: 'Bad request',
              reason: `Invalid file name for "${field}" field array: ${name}`,
              status: 400
            });
          }
          deleteFilesDto[field].splice(fileIndex, 1);
          deleteCount++;
        }
      } else {
        if (currentValue.data !== fileName) {
          throw new ResourceError(resource.name, {
            message: 'Bad request',
            reason: `Invalid file name for "${field}" field: ${fileName}`,
            status: 400
          });
        }
        deleteFilesDto[field] = null;
        deleteCount++;
      }
    }
    return { dto: deleteFilesDto, count: deleteCount };
  }
}
