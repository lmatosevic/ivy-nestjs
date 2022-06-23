import { Type } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { QueryOptions } from 'mongoose';
import { ResourceError } from '../resource';
import { FileDto } from '../storage';
import { ObjectUtil } from './object.util';
import * as _ from 'lodash';

export class RequestUtil {
  static maxQueryPageSize = 2000;
  static filterSpecialKeys = [
    '_and',
    '_or',
    '_nor',
    '_eq',
    '_gt',
    '_gte',
    '_in',
    '_lt',
    '_lte',
    '_ne',
    '_nin',
    '_regex',
    '_where',
    '_exists',
    '_all',
    '_size',
    '_elemMatch',
    '_not'
  ];

  static restrictQueryPageSize(options: QueryOptions, max?: number): QueryOptions {
    if (!max) {
      max = this.maxQueryPageSize;
    }

    if (Math.abs(options?.size) > max || !options?.size) {
      if (!options) {
        options = { size: max };
      } else {
        const sign = Math.sign(options?.size);
        options.size = sign !== 0 && !isNaN(sign) ? sign * max : max;
      }
    }
    return options;
  }

  static async deserializeAndValidate<T>(type: Type<T>, dataDto: T) {
    const instance = plainToClass(type, dataDto, {
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

  static transformFilter(filter: any): any {
    const newFilter = ObjectUtil.transfromKeysAndValues(
      filter,
      (key) => (this.filterSpecialKeys.includes(key) ? key.replace('_', '$') : key),
      (key, value) => {
        const valueArray = [];
        if (['_and', '_or', '_nor'].indexOf(key) !== -1) {
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

  static mapIdKeys(filter: any): any {
    return _.transform(filter, (result, value, key) => {
      result[key === 'id' ? '_id' : key] = _.isObject(value) ? this.mapIdKeys(value) : value;
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
      sortMap[value] = order;
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
