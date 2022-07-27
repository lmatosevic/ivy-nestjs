import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { PartialDeep } from 'type-fest';
import {
  Any,
  ArrayOverlap,
  Between,
  Equal,
  ILike,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Not
} from 'typeorm';
import { QueryOptions } from 'mongoose';
import { ResourceError } from '../resource';
import { FileDto } from '../storage';
import { ObjectUtil } from './object.util';
import * as _ from 'lodash';

export class RequestUtil {
  static filterQueryMappers = {
    _and: (arg) => ({ ...arg }),
    _or: (arg) => Object.keys(arg).map((k) => ({ [k]: arg[k] })),
    _nor: (arg) => Object.assign({}, ...Object.keys(arg).map((k) => ({ [k]: Not(arg[k]) }))),
    _eq: Equal,
    _gt: MoreThan,
    _gte: MoreThanOrEqual,
    _in: In,
    _lt: LessThan,
    _lte: LessThanOrEqual,
    _ne: (arg) => Not(Equal(arg)),
    _nin: (arg) => Not(In(arg)),
    _like: Like,
    _ilike: ILike,
    _exists: (arg) => (arg ? Not(IsNull()) : IsNull()),
    _all: ArrayOverlap,
    _elemMatch: Any,
    _not: Not
  };
  static filterQueryKeys = Object.keys(this.filterQueryMappers);

  static prepareQueryParams(
    options: QueryOptions,
    maxSize: number = 2000,
    defaultSize?: number,
    defaultSort?: string
  ): QueryOptions {
    if (Math.abs(options?.size) > maxSize || !options?.size) {
      if (!options && defaultSize) {
        options = { size: defaultSize };
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
        result[key] = _.isObject(value) ? addILikeOptions(value) : value;
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

        const valueArray = [];
        if (['_and', '_or', '_nor'].includes(key)) {
          Object.keys(value).forEach((valKey) => {
            valueArray.push({ [valKey]: value[valKey] });
          });
        } else {
          return value;
        }
        return valueArray;
      }
    );
    return this.mapIdKeys(newFilter);
  }

  static transformTypeormFilter(filter: any): any {
    return ObjectUtil.transfromKeysAndValues(
      filter,
      (key) => {
        if (['_and', '_or', '_nor'].includes(key)) {
          return null;
        }
        return key;
      },
      (key, value) => {
        if (value && typeof value === 'object' && !this.filterQueryKeys.includes(key)) {
          if (('_lt' in value || '_lte' in value) && ('_gt' in value || '_gte' in value)) {
            const from = value['_gt'] || value['_gte'];
            const to = value['_lt'] || value['_lte'];
            return Between(from, to);
          }

          for (const [subKey, subVal] of Object.entries(value)) {
            if (this.filterQueryKeys.includes(subKey)) {
              return this.filterQueryMappers[subKey](subVal);
            }
          }
        }

        if (['_and', '_or', '_nor'].includes(key)) {
          const mappedValues = this.filterQueryMappers[key](value);
          return key === '_or'
            ? mappedValues
            : Object.entries(mappedValues).map(([k, v]) => ({ key: k, value: v }));
        }

        return value;
      }
    );
  }

  static mapIdKeys(filter: any, newIdKey: string = '_id'): any {
    return _.transform(filter, (result, value, key) => {
      result[key === 'id' ? newIdKey : key] = _.isObject(value) ? this.mapIdKeys(value) : value;
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
