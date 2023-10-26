import { ColumnOptions, RelationOptions, JoinColumn, JoinTable, OneToOne, ManyToMany } from 'typeorm';
import { FILE_PROPS_KEY, FileProps } from './file-types';
import { PopulateRelation } from '../../resource';
import { File } from '../entity';

export function FileColumn(config: ColumnOptions & RelationOptions & FileProps & { populate?: boolean } = {}) {
  if (!('nullable' in config)) {
    config['nullable'] = true;
  }

  if (['public', 'private'].includes(config.access) && config.policy) {
    throw Error(`Cannot use file policy function with "${config.access}" access type`);
  }

  if (!config.access && config.policy) {
    config.access = 'protected';
  }

  return (target: Object, propertyKey: string) => {
    if (config.isArray) {
      ManyToMany(() => File, { cascade: true, ...(config as RelationOptions) })(target, propertyKey);
      JoinTable()(target, propertyKey);
    } else {
      OneToOne(() => File, { cascade: true, ...(config as RelationOptions) })(target, propertyKey);
      JoinColumn()(target, propertyKey);
    }

    if (config.populate === undefined || config.populate) {
      PopulateRelation()(target, propertyKey);
    }

    const columnData = Reflect.getMetadata(FILE_PROPS_KEY, target) || {};
    columnData[propertyKey] = config;
    Reflect.defineMetadata(FILE_PROPS_KEY, columnData, target);
  };
}
