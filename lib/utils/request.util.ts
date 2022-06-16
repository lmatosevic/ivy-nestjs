import { Type } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { QueryOptions } from 'mongoose';
import { ResourceError } from '../resource';
import { ObjectUtil } from './object.util';
import * as _ from 'lodash';

export class RequestUtil {
  static maxQueryLimit = 2000;

  static restrictQueryLimit(options: QueryOptions, max?: number): QueryOptions {
    if (!max) {
      max = this.maxQueryLimit;
    }

    if (Math.abs(options?.limit) > max || !options?.limit) {
      if (!options) {
        options = { limit: max };
      } else {
        const sign = Math.sign(options?.limit);
        options.limit = sign !== 0 && !isNaN(sign) ? sign * max : max;
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
      (key) => key.replace('_', '$'),
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
}
