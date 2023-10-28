import { ObjectUtil } from './object.util';
import { RequestUtil } from './request.util';
import * as _ from 'lodash';

export class FilterUtil {
  private static filterQueryMappers = {
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
    _exists: (k, v) => [`${k} IS ${!v || v === 'false' ? '' : 'NOT '}NULL`, {}],
    _all: (k, v, p) => [`${k} @> {:...${p}}`, { [`${p}`]: v }],
    _any: (k, v, p) => [`${k} = ANY(:...${p})`, { [`${p}`]: v }],
    _elemMatch: () => {
      throw Error('Unsupported operator "_elemMatch"');
    }
  };

  private static filterQueryKeys = Object.keys(this.filterQueryMappers);

  private static filterQueryOperators = ['_and', '_or', '_nor'];

  private static defaultFilterOperator = '_and';

  static getQueryKeys(): string[] {
    return this.filterQueryKeys;
  }

  static isQueryKey(key: string): boolean {
    return this.filterQueryKeys.includes(key);
  }

  static getQueryOperators(): string[] {
    return this.filterQueryOperators;
  }

  static isQueryOperator(operator: string): boolean {
    return this.filterQueryOperators.includes(operator);
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

    const newFilter = ObjectUtil.transformKeysAndValues(
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

        if (this.filterQueryOperators.includes(key) && !Array.isArray(value)) {
          return Object.entries(value).map(([opKey, opVal]) => ({ [opKey]: opVal }));
        }

        return value;
      }
    );
    return RequestUtil.mapIdKeys(newFilter, '_id');
  }

  static transformTypeormFilter(filter: any, modelName: string): any {
    const paramName = (name: string | any, op: string | any) => {
      const suffix = Math.floor(Math.random() * 999);
      return `${name.split('.').join('_')}_${op}_${suffix}`;
    };

    let wrappedFilter: any;
    if (Object.keys(filter).length === 1 && this.filterQueryOperators.includes(Object.keys(filter)[0])) {
      wrappedFilter = filter;
    } else {
      wrappedFilter = { [this.defaultFilterOperator]: { ...filter } };
    }

    return ObjectUtil.transformKeysAndValues(
      wrappedFilter,
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
            if (this.filterQueryKeys.includes(subKey) && !this.filterQueryOperators.includes(subKey)) {
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

        if (this.filterQueryOperators.includes(key) && !Array.isArray(value)) {
          return Object.entries(value).map(([opKey, opVal]) => ({ [opKey]: opVal }));
        }

        return value;
      }
    );
  }
}
