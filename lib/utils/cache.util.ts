import { MongooseResourceService, TypeOrmResourceService } from '../resource';
import { ModuleUtil } from './module.util';

export class CacheUtil {
  static createResourceCacheKey(
    baseKey: string,
    modelName: string,
    relations: string[] = [],
    resourceName?: string
  ): string {
    let key = baseKey;

    if ((relations.length === 1 && relations[0] === '*') || modelName) {
      const allRelations = this.resourceRelationNames(modelName);
      key = `${key}_!${allRelations.join('!')}!`;
    } else if (relations.length > 0) {
      key = `${key}_!${relations.join('!')}!`;
    } else if (resourceName) {
      const relations = this.resourceRelationNames(resourceName);
      if (!relations.includes(resourceName)) {
        relations.push(resourceName);
      }
      key = `${key}_!${relations.join('!')}!`;
    }

    return key;
  }

  static resourceRelationNames(resourceName?: string): string[] {
    const env = ModuleUtil.getCurrentEnv();
    const dbType = env.DB_TYPE || 'mongoose';

    const modelRelationNames =
      dbType === 'mongoose' ? MongooseResourceService.modelRelationNames : TypeOrmResourceService.modelRelationNames;

    if (!resourceName) {
      return Object.keys(modelRelationNames || {});
    }

    return modelRelationNames?.[resourceName] || [];
  }
}
