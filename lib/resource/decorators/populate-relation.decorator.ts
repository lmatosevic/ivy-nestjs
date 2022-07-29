export const POPULATE_RELATION_KEY = 'populateRelation';

export interface PopulateRelationConfig {
  populateChildren?: boolean;
  excludeRelations?: string[];
  includeRelations?: string[];
  maxDepth?: number;
  type?: 'all' | 'single' | 'multi';
}

export function PopulateRelation(config: PopulateRelationConfig = {}) {
  if (config.excludeRelations?.length > 0 && config.includeRelations?.length > 0) {
    throw new Error(
      `Cannot use both exclude and include relations property at the same time for PopulateRelation decorator`
    );
  }

  if (!config.maxDepth && config.maxDepth !== 0) {
    config.maxDepth = 5;
  }

  if (!config.type) {
    config.type = 'all';
  }

  return function (target: Object, propertyKey: string) {
    const populateRelationData = Reflect.getMetadata(POPULATE_RELATION_KEY, target) || {};
    populateRelationData[propertyKey] = config;
    Reflect.defineMetadata(POPULATE_RELATION_KEY, populateRelationData, target);
  };
}
