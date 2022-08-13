import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { PartialDeep } from 'type-fest';
import { QueryRequest, ResourceError } from '../resource';
import { FileDto } from '../storage';
import { ObjectUtil } from './object.util';
import * as _ from 'lodash';

type QueryOptions = Omit<QueryRequest<any>, 'filter'>;

export class RequestUtil {
  static filterQueryMappers = {
    _and: (k, v) => v,
    _or: (k, v) => v,
    _nor: (k, v) => v,
    _eq: (k, v, p) => [`${k} = :${p}`, { [`${p}`]: v }],
    _gt: (k, v, p) => [`${k} > :${p}`, { [`${p}`]: v }],
    _gte: (k, v, p) => [`${k} >= :${p}`, { [`${p}`]: v }],
    _in: (k, v, p) => [`${k} IN (:...${p})`, { [`${p}`]: v }],
    _lt: (k, v, p) => [`${k} < :${p}`, { [`${p}`]: v }],
    _lte: (k, v, p) => [`${k} <= :${p}`, { [`${p}`]: v }],
    _ne: (k, v, p) => [`${k} <> :${p}`, { [`${p}`]: v }],
    _nin: (k, v, p) => [`${k} NOT IN (:...${p})`, { [`${p}`]: v }],
    _like: (k, v, p) => [`${k} LIKE :${p}`, { [`${p}`]: v }],
    _ilike: (k, v, p) => [`${k} ILIKE :${p}`, { [`${p}`]: v }],
    _exists: (k, v) => [`${k} IS ${!v ? '' : 'NOT '}NULL`, {}],
    _all: (k, v, p) => [`${k} @> {:...${p}}`, { [`${p}`]: v }],
    _any: (k, v, p) => [`${k} = ANY(:...${p})`, { [`${p}`]: v }],
    _elemMatch: () => {
      throw Error('Unsupported operator "_elemMatch"');
    }
  };
  static filterQueryKeys = Object.keys(this.filterQueryMappers);
  static filterQueryBrackets = ['_and', '_or', '_nor'];

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

  static transformMongooseFilter(filter: any): any {
    const addILikeOptions = (obj: any) => {
      return _.transform(obj, (result, value, key) => {
        result[key] = _.isPlainObject(value) ? addILikeOptions(value) : value;
        if (key === '_ilike') {
          result['$options'] = 'i';
        }
      });
    };

    filter = addILikeOptions(filter);

    const newFilter = ObjectUtil.transfromKeysAndValues(
      filter,
      (key) => {
        if (['_like', '_ilike'].includes(key)) {
          return '$regex';
        }
        return this.filterQueryKeys.includes(key) ? key.replace('_', '$') : key;
      },
      (key, value) => {
        if (['_like', '_ilike'].includes(key)) {
          const prefix = value.trim().startsWith('%') ? '' : '^';
          const suffix = value.trim().endsWith('%') ? '' : '$';
          return (
            prefix +
            value
              .trim()
              .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              .replace(/\\\\\[/g, '\\[')
              .replace(/\\\\]/g, '\\]')
              .replace(/\\\[/g, '[')
              .replace(/\\]/g, ']')
              .replace(/%/g, '.*')
              .replace(/\\\\\.\*/g, '%')
              .replace(/_/g, '.')
              .replace(/\\\\\./g, '_') +
            suffix
          );
        }

        if (this.filterQueryBrackets.includes(key) && !Array.isArray(value)) {
          return Object.entries(value).map(([opKey, opVal]) => ({ [opKey]: opVal }));
        }

        return value;
      }
    );
    return this.mapIdKeys(newFilter);
  }

  static transformTypeormFilter(filter: any, modelName: string): any {
    const paramName = (name: string | any, op: string | any) => {
      const suffix = Math.floor(Math.random() * 999);
      return `${name.split('.').join('_')}_${op}_${suffix}`;
    };

    return ObjectUtil.transfromKeysAndValues(
      filter,
      (key) => key,
      (key, value, keyList) => {
        const propertyKeys = keyList?.filter((k) => !this.filterQueryKeys.includes(k));
        const path = propertyKeys?.join('_') || modelName;

        if (value && typeof value === 'object' && !this.filterQueryKeys.includes(key)) {
          const operatorList = [];
          let subPath =
            !propertyKeys || propertyKeys.length <= 2
              ? `${path}.${key}`
              : `${propertyKeys.slice(0, -1).join('_')}.${propertyKeys[propertyKeys.length - 1]}`;

          for (const [subKey, subVal] of Object.entries(value)) {
            if (this.filterQueryKeys.includes(subKey)) {
              if (propertyKeys?.length >= 2) {
                subPath = subPath.replace(`_${key}.`, '.');
              }
              operatorList.push(this.filterQueryMappers[subKey](subPath, subVal, paramName(subPath, subKey)));
            }
          }
          return operatorList.length > 0 ? operatorList : value;
        }

        if (typeof value !== 'object' && !this.filterQueryKeys.includes(key)) {
          const simplePath = `${path}.${key}`;
          return this.filterQueryMappers['_eq'](simplePath, value, paramName(simplePath, '_eq'));
        }

        if (this.filterQueryBrackets.includes(key) && !Array.isArray(value)) {
          return Object.entries(value).map(([opKey, opVal]) => ({ [opKey]: opVal }));
        }

        return value;
      }
    );
  }

  static mapIdKeys(filter: any, newIdKey: string = '_id'): any {
    return _.transform(filter, (result, value, key) => {
      result[key === 'id' ? newIdKey : key] = _.isPlainObject(value) ? this.mapIdKeys(value) : value;
    });
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

  static transformQueryParamsToFilter(params: Record<string, any>): any {
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
