import { Logger } from '@nestjs/common';
import {
  Brackets,
  EntityManager,
  NotBrackets,
  QueryRunner,
  ReplicationMode,
  Repository,
  SelectQueryBuilder
} from 'typeorm';
import { PartialDeep } from 'type-fest';
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata';
import { IsolationLevel } from 'typeorm/driver/types/IsolationLevel';
import { ResourceError } from '../../resource/errors';
import { FILE_PROPS_KEY, FileError, FileManager, FileProps } from '../../storage';
import { POPULATE_RELATION_KEY, PopulateRelationConfig } from '../decorators';
import { Action } from '../../enums';
import { AggregateRequest, AggregateResponse, QueryRequest, QueryResponse } from '../dto';
import { FilesUtil, FilterUtil, ObjectUtil, RequestUtil, StringUtil } from '../../utils';
import { ResourceService } from './resource.service';
import { ResourceEntity } from '../entity';
import { ResourcePolicyService } from '../policy';
import * as _ from 'lodash';

type ModelReferences = {
  fields: string[];
  files: string[];
  relations: string[];
  relationMetadata: Record<string, RelationMetadata>;
  relationPopulation: Record<string, PopulateRelationConfig>;
  fileProps: Record<string, FileProps>;
};

type JoinOptions = {
  alias: string;
  relations: RelationInfo[];
  relationJoin: Record<string, string>;
  queryJoin: Record<string, string>;
};

type RelationInfo = {
  name: string;
  isMany?: boolean;
  isEager?: boolean;
};

export abstract class TypeOrmResourceService<T extends ResourceEntity>
  extends ResourcePolicyService
  implements ResourceService<T>
{
  public static modelRelationNames: Record<string, string[]>;
  public static modelReferences: Record<string, ModelReferences>;

  private readonly log = new Logger(TypeOrmResourceService.name);

  protected isProtected: boolean = false;
  protected entityManager?: EntityManager;

  protected constructor(
    protected repository: Repository<T & ResourceEntity>,
    protected fileManager?: FileManager
  ) {
    super('id');

    if (!TypeOrmResourceService.modelReferences) {
      TypeOrmResourceService.modelReferences = this.initAllReferences();
    }
    if (!TypeOrmResourceService.modelRelationNames) {
      TypeOrmResourceService.modelRelationNames = this.initRelationModelNames();
    }
  }

  async startTransaction(
    isolationLevel?: IsolationLevel,
    replicationMode?: ReplicationMode
  ): Promise<{ queryRunner: QueryRunner; manager: EntityManager }> {
    const queryRunner = this.repository.metadata.connection.createQueryRunner(replicationMode);
    const manager = queryRunner.manager;
    await queryRunner.connect();
    await queryRunner.startTransaction(isolationLevel);
    return { manager, queryRunner };
  }

  useWith(sessionManager: EntityManager): TypeOrmResourceService<T> {
    const managedService = ObjectUtil.duplicate<TypeOrmResourceService<T>>(this);

    const repository: Repository<T & ResourceEntity> = sessionManager.getRepository(this.repository.metadata.name);

    managedService.setProtected(this.isProtected);
    managedService.setRepository(repository);
    managedService.setEntityManager(sessionManager);
    managedService.setFileManager(this.fileManager.useWith(sessionManager));

    return managedService;
  }

  asProtected(): TypeOrmResourceService<T> {
    const protectedService = ObjectUtil.duplicate<TypeOrmResourceService<T>>(this);

    protectedService.setProtected(true);
    protectedService.setRepository(this.repository);
    protectedService.setEntityManager(this.entityManager);

    return protectedService;
  }

  async find(id: string | number): Promise<T> {
    return this.findResource(id);
  }

  async query(queryDto: QueryRequest<T>): Promise<QueryResponse<T>> {
    let { filter, ...options } = queryDto;
    let results;
    let totalCount;

    filter = _.merge(_.cloneDeep(filter || {}), this.policyFilter());

    const projection = this.policyProjection(false);

    if (options?.sort) {
      options.sort = RequestUtil.normalizeSort(options.sort);
    }

    const { repository, queryRunner } = await this.repositoryAndRunner();

    try {
      const { queryBuilder, whereQuery, joins, modelAlias } = this.makeQueryBuilderParts(
        filter,
        projection,
        repository,
        false
      );

      const sortKeys = ObjectUtil.nestedKeys(options.sort);
      for (const sortKey of sortKeys) {
        const order = _.get(options.sort, sortKey);
        if (typeof order !== 'object') {
          const { path } = this.makeAliasAndPath(sortKey.split('.'), modelAlias);
          queryBuilder.addOrderBy(path, order?.toUpperCase() ?? 'ASC');
        }
      }

      results = await queryBuilder
        .skip((options.page - 1) * options.size || 0)
        .take(options.size)
        .getMany();

      const countQueryBuilder = repository.createQueryBuilder().where(whereQuery);

      for (const [alias, path] of Object.entries(joins.relationJoin)) {
        countQueryBuilder.leftJoin(path, alias);
      }

      for (const [alias, path] of Object.entries(joins.queryJoin)) {
        countQueryBuilder.leftJoin(path, alias);
      }

      totalCount = await countQueryBuilder.getCount();

      if (!this.entityManager) {
        await queryRunner.commitTransaction();
      }
    } catch (e) {
      if (!this.entityManager) {
        await queryRunner.rollbackTransaction();
      }
      this.log.debug(e);
      throw new ResourceError(repository.metadata.name, {
        message: 'Bad request',
        reason: e.message,
        status: 400
      });
    } finally {
      if (!this.entityManager) {
        await queryRunner.release();
      }
    }

    return {
      totalCount,
      resultCount: results.length,
      items: results as T[]
    };
  }

  async aggregate(aggregateDto: AggregateRequest<T>): Promise<AggregateResponse<T>> {
    let { filter, select, range } = aggregateDto;
    let items = [];
    let total = {};

    filter = _.merge(_.cloneDeep(filter || {}), this.policyFilter());

    const projection = this.policyProjection(false);

    const { repository, queryRunner } = await this.repositoryAndRunner();

    try {
      const { whereQuery, joins, modelAlias } = this.makeQueryBuilderParts(filter, projection, repository, false);
      const aggregateQueryBuilder = repository.createQueryBuilder().where(whereQuery);

      const startDate = new Date(range?.start);
      const endDate = new Date(range?.end);
      const stepSeconds = range.step ?? 3600;
      const halfStep = Math.round(stepSeconds / 2);
      const dateField = range.dateField ?? 'createdAt';

      const timeRangeCondition = `("${modelAlias}"."${dateField}" - (1 * INTERVAL '${halfStep} seconds')) AT TIME ZONE 'UTC' < TO_TIMESTAMP(column1, 'YYYY-MM-DD"T"HH24:MI:ss') AND ("${modelAlias}"."${dateField}" + (1 * INTERVAL '${halfStep} seconds')) AT TIME ZONE 'UTC' > TO_TIMESTAMP(column1, 'YYYY-MM-DD"T"HH24:MI:ss')`;

      const aggregateRangeSelect: Array<{ func: string; alias: string }> = [];

      let index = 0;
      for (const [field, value] of Object.entries(select || {})) {
        for (const [func, enabled] of Object.entries(value || {})) {
          if (!enabled) {
            continue;
          }
          const { path } = this.makeAliasAndPath(field.split('.'), modelAlias);

          if (['first', 'last'].includes(func)) {
            const { path: datePath } = this.makeAliasAndPath(['createdAt'], modelAlias);
            const positionalQuery = repository
              .createQueryBuilder()
              .where(whereQuery)
              .select(path, func)
              .orderBy(datePath, func === 'first' ? 'ASC' : 'DESC')
              .limit(1);

            const querySql = positionalQuery.getSql();

            aggregateRangeSelect.push({
              func: `(${positionalQuery.andWhere(timeRangeCondition).getSql()})`,
              alias: `${field}_${func}`
            });
            aggregateQueryBuilder[index > 0 ? 'addSelect' : 'select'](`(${querySql})`, `${field}_${func}`);
            index += 1;

            continue;
          }

          aggregateRangeSelect.push({
            func: `${func.toUpperCase()}(${path
              .split('.')
              .map((p) => `"${p}"`)
              .join('.')})`,
            alias: `${field}_${func}`
          });
          aggregateQueryBuilder[index > 0 ? 'addSelect' : 'select'](
            `${func.toUpperCase()}(${path})`,
            `${field}_${func}`
          );
          index += 1;
        }
      }

      if (index > 0) {
        for (const [alias, path] of Object.entries(joins.queryJoin)) {
          aggregateQueryBuilder.leftJoin(path, alias);
        }

        const aggregated = await aggregateQueryBuilder.getRawOne();

        for (const [key, value] of Object.entries(aggregated)) {
          const keyParts = key.split('_');
          const func = keyParts.pop();
          const field = keyParts.join('_');
          _.set(total, `${field}.${func}`, StringUtil.toNumericValue(value as string));
        }

        if (range) {
          const dates = [];

          const currentDate = new Date(startDate);
          while (currentDate < endDate) {
            dates.push(currentDate.toISOString().split('.').shift());
            currentDate.setSeconds(currentDate.getSeconds() + stepSeconds);
          }

          if (dates.length > 0) {
            const dateValues = dates.map((d) => `('${d}')`).join(',');

            const rangeQuery = queryRunner.manager
              .createQueryBuilder()
              .select('column1') // column1 is actually datetime value, TypeOrm is adding quotes, so it is not mapping to datetime correctly
              .where(whereQuery)
              .orWhere(`"${modelAlias}" IS NULL`)
              .from(`(values ${dateValues})`, 's(datetime)')
              .leftJoin(this.repository.metadata.tableName, modelAlias, timeRangeCondition)
              .groupBy('column1')
              .orderBy('column1');

            for (let select of aggregateRangeSelect) {
              rangeQuery.addSelect(select.func, select.alias);
            }

            for (const [alias, path] of Object.entries(joins.queryJoin)) {
              rangeQuery.leftJoin(path, alias);
            }

            const rangeResults = await rangeQuery.getRawMany();

            for (let result of rangeResults) {
              const item = {};
              for (const [key, value] of Object.entries(result)) {
                const keyParts = key.split('_');
                const func = keyParts.pop();
                const field = keyParts.join('_');
                if (field && func) {
                  _.set(item, `${field}.${func}`, StringUtil.toNumericValue(value as string));
                }
              }
              items.push(item);
            }
          }
        }
      }

      if (!this.entityManager) {
        await queryRunner.commitTransaction();
      }
    } catch (e) {
      if (!this.entityManager) {
        await queryRunner.rollbackTransaction();
      }
      this.log.debug(e);
      throw new ResourceError(repository.metadata.name, {
        message: 'Bad request',
        reason: e.message,
        status: 400
      });
    } finally {
      if (!this.entityManager) {
        await queryRunner.release();
      }
    }

    return { total, items };
  }

  async create(createDto: PartialDeep<T>): Promise<T> {
    let createdModel;
    let storedFiles;

    const intersectedDto = this.intersectFields(createDto);

    let model = this.repository.create(intersectedDto as any) as any;
    if (!model.createdBy && this.fields().includes('createdBy')) {
      model.createdBy = this.getAuthUser()?.getId();
    }

    model = _.assign(model, intersectedDto) as any;

    try {
      storedFiles = await this.persistResourceFiles(model, null, false, this.repository as Repository<ResourceEntity>);

      createdModel = await this.repository.save(model);

      await this.updateFilesMetaResourceIds(storedFiles, createdModel, this.repository as Repository<ResourceEntity>);
    } catch (e) {
      this.log.debug(e);
      await this.fileManager?.deleteFileArray(storedFiles);
      if (e instanceof FileError) {
        throw e;
      }
      throw new ResourceError(this.repository.metadata.name, {
        message: e.message,
        reason: e.detail,
        status: e.constraint ? 400 : 500
      });
    }

    await this.expireCache(this.repository.metadata.name, Action.Create);

    return this.findResource(createdModel.id);
  }

  async createBulk(createDtos: PartialDeep<T>[]): Promise<T[]> {
    const results = [];
    for (const createDto of createDtos) {
      try {
        results.push(await this.create(createDto));
      } catch (e) {
        // ignore
      }
    }
    return results;
  }

  async update(id: string | number, updateDto: PartialDeep<T>, isFileUpload?: boolean): Promise<T> {
    let updatedModel;
    let storedFiles;

    delete updateDto.id;

    let intersectedDto = this.intersectFields(updateDto);

    let resource = await this.findResource(id, false);
    const currentResource = _.cloneDeep(resource);

    resource = _.assign(resource, intersectedDto) as any;

    if (isFileUpload) {
      FilesUtil.mergeFileArrays(currentResource, resource, this.fileFields());
    }

    try {
      storedFiles = await this.persistResourceFiles(
        resource,
        currentResource,
        isFileUpload,
        this.repository as Repository<ResourceEntity>
      );

      updatedModel = await this.repository.save(resource);

      await this.updateFilesMetaResourceIds(storedFiles, updatedModel, this.repository as Repository<ResourceEntity>);

      const filesToDelete = await this.resourceFilesToDelete(
        currentResource,
        updatedModel,
        this.repository as Repository<ResourceEntity>
      );
      await this.fileManager?.deleteFileArray(filesToDelete);
    } catch (e) {
      this.log.debug(e);
      await this.fileManager?.deleteFileArray(storedFiles);
      if (e instanceof FileError) {
        throw e;
      }
      throw new ResourceError(this.repository.metadata.name, {
        message: e.message,
        reason: e.detail,
        status: e.constraint ? 400 : 500
      });
    }

    await this.expireCache(this.repository.metadata.name, Action.Update);

    return this.findResource(updatedModel.id);
  }

  async updateBulk(updateDtos: PartialDeep<T>[]): Promise<T[]> {
    const results = [];
    for (const updateDto of updateDtos) {
      try {
        results.push(await this.update(updateDto.id, updateDto));
      } catch (e) {
        // ignore
      }
    }
    return results;
  }

  async delete(id: string | number): Promise<T> {
    const resource = await this.findResource(id, false);
    const currentResource = _.cloneDeep(resource);

    try {
      const filesToDelete = await this.resourceFilesToDelete(
        resource,
        null,
        this.repository as Repository<ResourceEntity>
      );

      await this.repository.remove(resource);

      await this.fileManager?.deleteFileArray(filesToDelete);
    } catch (e) {
      this.log.debug(e);
      throw new ResourceError(this.repository.metadata.name, {
        message: e.message,
        reason: e.detail,
        status: e.constraint ? 400 : 500
      });
    }

    await this.expireCache(this.repository.metadata.name, Action.Delete);

    return currentResource;
  }

  async deleteBulk(ids: (string | number)[]): Promise<T[]> {
    const results = [];
    for (const id of ids) {
      try {
        results.push(await this.delete(id));
      } catch (e) {
        // ignore
      }
    }
    return results;
  }

  private async findResource(id: string | number, useReadPolicy: boolean = true): Promise<T> {
    let result;

    const filter = { _and: [{ id }, this.policyFilter(useReadPolicy)] };
    const projection = this.policyProjection(false);

    try {
      const { queryBuilder } = this.makeQueryBuilderParts(filter, projection);

      result = await queryBuilder.getOne();
    } catch (e) {
      this.log.debug(e);
      throw new ResourceError(this.repository.metadata.name, {
        message: 'Bad request',
        reason: e.message,
        status: 400
      });
    }

    if (!result) {
      throw new ResourceError(this.repository.metadata.name, {
        message: 'Not Found for id: ' + id,
        status: 404
      });
    }

    return result as T;
  }

  private async repositoryAndRunner() {
    let repository = this.repository;
    let queryRunner;
    if (!this.entityManager) {
      queryRunner = this.repository.metadata.connection.createQueryRunner();
      repository = queryRunner.manager.getRepository(this.repository.metadata.name);

      await queryRunner.connect();
      await queryRunner.startTransaction();
    }
    return { repository, queryRunner };
  }

  private makeQueryBuilderParts(
    filter?: any,
    projection?: any,
    repository?: Repository<T & ResourceEntity>,
    single: boolean = true
  ): {
    queryBuilder: SelectQueryBuilder<T & ResourceEntity>;
    whereQuery: Brackets;
    joins: JoinOptions;
    modelAlias: string;
  } {
    if (!repository) {
      repository = this.repository;
    }

    const hasProjections = Object.keys(projection || {}).length > 0;
    if (hasProjections && !Object.keys(projection).includes('id')) {
      projection = _.merge(_.cloneDeep(projection), { id: 1 });
    }

    const joins = this.buildJoinRelations(filter, single);
    const modelAlias = joins.alias;

    if (Object.keys(filter).length > 0) {
      filter = FilterUtil.transformTypeormFilter(filter, repository.metadata.name);
      this.log.debug('Transformed filter: %j', filter);
    }

    const whereQuery = this.buildWhereQuery(filter, joins);

    const queryBuilder = repository.createQueryBuilder(modelAlias).where(whereQuery);

    let mappedProjections = [];
    if (hasProjections) {
      let first = true;
      for (const proj of Object.keys(projection)) {
        const { alias, path } = this.makeAliasAndPath(proj.split('.'), modelAlias);

        // Skip relation fields since they are selected in join statements
        if (!this.relationMetadata(alias)) {
          queryBuilder[first ? 'select' : 'addSelect'](path);
        }

        mappedProjections.push(alias);
        first = false;
      }
    }

    const eagerRelations = this.eagerRelationsList();

    for (const [alias, path] of Object.entries(joins.relationJoin)) {
      const relationName = alias.replace(/_/g, '.');
      const relationInfo = joins.relations.find((rel) => rel.name === relationName);
      const isEager = eagerRelations.find((e) => e.name === relationName);
      if (
        (!this.isProtected && !isEager) ||
        (this.isProtected && !relationInfo) ||
        (hasProjections && !mappedProjections.includes(alias))
      ) {
        queryBuilder.leftJoin(path, alias);
      } else {
        queryBuilder.leftJoinAndSelect(path, alias);
      }
    }

    for (const [alias, path] of Object.entries(joins.queryJoin)) {
      queryBuilder.leftJoin(path, alias);
    }

    return { queryBuilder, whereQuery, joins, modelAlias };
  }

  private buildWhereQuery(
    filter: any,
    joins: JoinOptions,
    usedJoins?: Record<string, boolean>,
    isNot?: boolean
  ): Brackets | NotBrackets {
    const brackets = isNot ? NotBrackets : Brackets;

    return new brackets((qb) => {
      let first = true;

      let bracketUsedJoins = usedJoins;
      if (!bracketUsedJoins) {
        bracketUsedJoins = Object.keys(joins.queryJoin).reduce((obj, alias) => {
          obj[alias] = false;
          return obj;
        }, {});
      }

      for (const [key, value] of Object.entries(filter)) {
        let whereKey = first ? 'where' : 'andWhere';

        // Map AND & OR operators using recursive brackets expressions
        if (FilterUtil.isQueryOperator(key) && Array.isArray(value)) {
          for (const operator of value) {
            const whereType = key === '_and' ? 'andWhere' : 'orWhere';
            whereKey = first ? 'where' : whereType;
            switch (key) {
              case '_and':
                qb[whereKey](this.buildWhereQuery(operator, joins, bracketUsedJoins, false));
                break;
              case '_or':
                qb[whereKey](this.buildWhereQuery(operator, joins, bracketUsedJoins, false));
                break;
              case '_nor':
                qb[whereKey](this.buildWhereQuery(operator, joins, bracketUsedJoins, true));
                break;
            }
            first = false;
          }
          continue;
        }

        // Add where statements for entity properties with single or multiple values and replace relation join alias
        // with query join alias to prevent data exclusion from array relations caused by filtering by sub-relations
        if (!FilterUtil.isQueryKey(key) && Array.isArray(value)) {
          if (value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'object') {
            let statement = this.replaceQueryJoinAlias(value[0], joins, bracketUsedJoins);
            qb[whereKey](statement, value[1]);
            first = false;
          } else {
            for (const operatorValue of value) {
              whereKey = first ? 'where' : 'andWhere';
              if (
                operatorValue.length === 2 &&
                typeof operatorValue[0] === 'string' &&
                typeof operatorValue[1] === 'object'
              ) {
                let statement = this.replaceQueryJoinAlias(operatorValue[0], joins, bracketUsedJoins);
                qb[whereKey](statement, operatorValue[1]);
                first = false;
              }
            }
          }
          continue;
        }

        // Recursively traverse nested relation properties map
        if (!FilterUtil.isQueryKey(key) && typeof value === 'object') {
          qb[whereKey](this.buildWhereQuery(value, joins, bracketUsedJoins, isNot));
          first = false;
        }
      }
    });
  }

  private replaceQueryJoinAlias(statement: string, joins: JoinOptions, usedJoins: Record<string, boolean>): string {
    const joinAlias = Object.entries(joins.relationJoin).find(([a, p]) => statement.startsWith(a + '.'));
    if (joinAlias) {
      const lookupAlias = `${joinAlias[0]}__${joins.alias}`;
      const queryJoin = Object.entries(joins.queryJoin).find(
        ([a, p]) => a.startsWith(lookupAlias) && usedJoins[a] === false
      );
      if (queryJoin) {
        statement = statement.replace(joinAlias[0], queryJoin[0]);
        usedJoins[queryJoin[0]] = true;
      }
    }
    return statement;
  }

  private buildJoinRelations(filter?: any, single: boolean = true): JoinOptions {
    let relations = this.relationsToPopulate(single);
    const modelName = this.repository.metadata.name;
    const joinOptions: JoinOptions = {
      alias: modelName,
      relations,
      relationJoin: {},
      queryJoin: {}
    };

    const filterKeys = ObjectUtil.nestedKeys(filter, FilterUtil.getQueryKeys(), (key, value, keys) => {
      let totalCount = 0;
      for (const bracketKey of FilterUtil.getQueryOperators()) {
        const bracketValue = value[bracketKey];
        if (bracketValue && Array.isArray(bracketValue)) {
          totalCount += bracketValue.length;
        }
      }
      for (let i = 0; i < totalCount - 1; i++) {
        keys.push(key);
      }
    });
    const filterKeysCount = _.countBy(filterKeys);

    if (!this.isProtected && filter) {
      // Remove relations with populate relation decorator
      relations = relations.filter((r) => filterKeys.includes(r.name));
      // Add eager relations to population array
      const eagerRelations = this.eagerRelationsList();
      for (const eagerRelation of eagerRelations) {
        if (!relations.find((r) => r.name === eagerRelation.name)) {
          relations.push(eagerRelation);
        }
      }
    }

    for (const relation of relations) {
      const relationParts = relation.name.split('.');

      const { alias, path } = this.makeAliasAndPath(relationParts, modelName);
      if (alias && path) {
        joinOptions.relationJoin[alias] = path;
      }

      // Query join statements are used to separate data selection from where query filtering on manyTo relations
      // or any type of subrelations. If filter cotains an array of relational subfilters, every array
      // item needs to have separate query join with different name to avoid data loss.
      if (alias && path && filterKeys.includes(relation.name)) {
        let queryJoins = this.makeRelationQueryJoins(
          relation.name,
          alias,
          path,
          filterKeysCount,
          joinOptions.queryJoin
        );
        Object.entries(queryJoins).forEach(([a, p]) => (joinOptions.queryJoin[a] = p));
      }
    }

    // Add all relations excluded from population but used in where query as query join statements. As in filter
    // relations mapping, relations are also supported as multiple innter join statements for every filter occurance.
    const filterRelations = this.filtersAliasAndPaths(filterKeys, modelName);
    for (const filterRelation of filterRelations) {
      const { alias, path, name } = filterRelation;
      if (alias && path && name) {
        let queryJoins = this.makeRelationQueryJoins(name, alias, path, filterKeysCount, joinOptions.queryJoin);
        Object.entries(queryJoins).forEach(([a, p]) => {
          if (!joinOptions.relationJoin[a] && !joinOptions.queryJoin[a]) {
            joinOptions.queryJoin[a] = p;
          }
        });
        if (!joinOptions.relationJoin[alias] && !joinOptions.queryJoin[alias]) {
          joinOptions.relationJoin[alias] = path;
        }
      }
    }

    const removeAliases = [];
    for (const [alias, path] of Object.entries(joinOptions.queryJoin)) {
      const parts = path.split('.');
      if (parts.length === 1 || parts[0] === modelName) {
        continue;
      }
      const pathAlias = parts[0];
      const inJoin = Object.keys(joinOptions.queryJoin).some((a) => a === pathAlias);
      const inLeft = Object.values(joinOptions.relationJoin).some((p) => p === path);
      if (!inJoin && !inLeft) {
        removeAliases.push(alias);
      }
    }

    // Remove all query join values that rely on non-existing aliases generated by duplicated filter array keys
    for (const alias of removeAliases) {
      delete joinOptions.queryJoin[alias];
    }

    this.log.debug('Join options: %j', joinOptions);

    return joinOptions;
  }

  private makeRelationQueryJoins(
    relationName: string,
    alias: string,
    path: string,
    filterKeysCount: Record<string, number>,
    queryJoin: Record<string, string>,
    modelName?: string
  ): Record<string, string> {
    modelName = modelName ?? this.repository.metadata.name;
    const joins = {};
    let occurances = filterKeysCount[relationName];
    const { path: parentPath } = this.makeAliasAndPath(path.split('.').slice(0, -1), modelName);
    for (let i = 0; i < occurances; i++) {
      let suffix = i > 0 ? '_' + i : '';
      let newPath;
      const childJoin = Object.entries(queryJoin).find(([a, p]) => p === parentPath);
      if (childJoin) {
        const parts = path.split('.');
        if (parts.length > 1) {
          newPath = `${childJoin[0]}${suffix}.${parts[1]}`;
        }
      }
      joins[`${alias}__${modelName}${suffix}`] = newPath ?? path;
    }
    return joins;
  }

  private makeAliasAndPath(relationParts: string[], modelName: string): { alias: string; path: string } {
    let alias;
    let path;
    if (relationParts.length === 1) {
      alias = relationParts[0];
      path = `${modelName}.${alias}`;
    } else if (relationParts.length > 1) {
      alias = relationParts.join('_');
      path = `${relationParts.slice(0, -1).join('_')}.${relationParts[relationParts.length - 1]}`;
    }
    return { alias, path };
  }

  private filtersAliasAndPaths(
    filterKeys: string[],
    modelName: string,
    parentKey?: string
  ): { alias: string; path: string; name: string }[] {
    const items = [];

    for (const filterKey of filterKeys) {
      const relationMetadata = this.relationMetadata(filterKey, modelName);

      if (relationMetadata) {
        const relationModelName = relationMetadata.type['name'];
        const relationParts = [...(parentKey ? [parentKey] : []), ...filterKey.split('.')];
        const { alias, path } = this.makeAliasAndPath(relationParts, modelName);
        const name = parentKey ? `${parentKey}.${filterKey}` : filterKey;
        if (alias && path) {
          if (!path.startsWith(modelName) || this.repository.metadata.name === modelName) {
            items.push({ alias, path, name });
          }
        }

        items.push(
          ...this.filtersAliasAndPaths(
            filterKeys.filter((fk) => fk.startsWith(filterKey + '.')).map((fk) => fk.replace(filterKey + '.', '')),
            relationModelName,
            name
          )
        );
      }
    }

    return items;
  }

  private relationsToPopulate(
    single: boolean = true,
    modelName?: string,
    level: number = 0,
    excludeFields: string[] = []
  ): RelationInfo[] {
    const fields = [];

    const relationPopulation = this.relationPopulationList(modelName);

    for (const [relation, config] of Object.entries(relationPopulation || {})) {
      if (
        excludeFields?.includes(relation) ||
        (single && config.type === 'multi') ||
        (!single && config.type === 'single')
      ) {
        continue;
      }

      const relationMetadata = this.relationMetadata(relation, modelName);

      fields.push({
        name: relation,
        isMany: relationMetadata.isOneToMany || relationMetadata.isManyToMany,
        isEager: relationMetadata.isEager
      });

      if (config.populateChildren !== false && config.maxDepth > 0) {
        const subRelationModelName = relationMetadata.type['name'];

        if (level >= config.maxDepth) {
          continue;
        }

        let subRelations = [];
        if (!config.includeRelations && (!config.excludeRelations || config.excludeRelations?.length > 0)) {
          subRelations = this.relationsToPopulate(single, subRelationModelName, level + 1, config.excludeRelations);
        } else if (config.includeRelations?.length > 0) {
          const subRelationFields = this.relationFields(subRelationModelName);
          subRelations = this.relationsToPopulate(
            single,
            subRelationModelName,
            level + 1,
            subRelationFields.filter((srf) => !config.includeRelations.includes(srf))
          );
        } else {
          subRelations = this.relationFields(subRelationModelName);
        }

        fields.push(
          ...subRelations
            .map((sr) => ({
              name: `${relation}.${sr.name}`,
              isMany: sr.isMany,
              isEager: sr.isEager
            }))
            .filter((f) => !excludeFields?.includes(f.name))
        );
      }
    }

    return fields;
  }

  private eagerRelationsList(modelName?: string): RelationInfo[] {
    const fields = [];

    const relations = this.relationMetadataList(modelName);

    for (const [relation, metadata] of Object.entries(relations || {})) {
      if (!metadata.isEager) {
        continue;
      }

      const relationMetadata = this.relationMetadata(relation, modelName);
      const relationModelName = metadata.type['name'];

      fields.push({
        name: relation,
        isMany: relationMetadata.isOneToMany || relationMetadata.isManyToMany,
        isEager: true
      });

      let subRelations = this.eagerRelationsList(relationModelName);

      fields.push(
        ...subRelations.map((sr) => ({
          name: `${relation}.${sr.name}`,
          isMany: sr.isMany,
          isEager: true
        }))
      );
    }

    return fields;
  }

  private async persistResourceFiles(
    resource: ResourceEntity,
    currentResource: ResourceEntity,
    isFileUpload: boolean,
    repository: Repository<ResourceEntity>
  ): Promise<string[]> {
    const modelName = repository.metadata?.name;
    const relations = this.relationFields(modelName);

    const storedFiles = [];

    const fileFileds = this.fileFields(modelName);

    let resourceEntity = repository.create(resource);
    resourceEntity = _.assign(resourceEntity, resource);

    const fileNames = await this.fileManager?.persistFiles(
      this.fileProps(modelName),
      resourceEntity,
      currentResource,
      isFileUpload
    );

    for (const fileName of fileNames) {
      storedFiles.push(fileName);
    }

    for (const relation of relations) {
      if (fileFileds.includes(relation)) {
        continue;
      }

      const relationMetadata = this.relationMetadata(relation, modelName);
      const relationModelName = relationMetadata.type['name'];

      if (relationMetadata.isCascadeUpdate || relationMetadata.isCascadeInsert) {
        let referencedResources = resource[relation];
        const currentReferencedResources = currentResource?.[relation];
        if (!referencedResources) {
          continue;
        }

        if (!Array.isArray(referencedResources)) {
          referencedResources = [referencedResources];
        }

        for (const referencedResource of referencedResources) {
          const referencedRepository: Repository<ResourceEntity> =
            this.repository.manager.getRepository(relationModelName);

          const storedSubReferenceFiles = await this.persistResourceFiles(
            referencedResource,
            Array.isArray(currentReferencedResources)
              ? currentReferencedResources.find((crr) => crr.id === referencedResource.id)
              : currentReferencedResources,
            false,
            referencedRepository
          );

          for (const storedFile of storedSubReferenceFiles) {
            storedFiles.push(storedFile);
          }
        }
      }
    }

    return storedFiles;
  }

  private async updateFilesMetaResourceIds(
    storedFiles: string[],
    resource: ResourceEntity,
    repository: Repository<ResourceEntity>
  ): Promise<void> {
    const modelName = repository.metadata?.name;
    const relations = this.relationFields(modelName);

    const fileFileds = this.fileFields(modelName);

    for (const relation of relations) {
      if (fileFileds.includes(relation)) {
        let fileData = await resource[relation];
        if (fileData && storedFiles.length > 0) {
          if (!Array.isArray(fileData)) {
            fileData = [fileData];
          }
          const resourceFiles = fileData.map((fd) => fd.data);
          const filesMetaToUpdate = storedFiles.filter((sf) => resourceFiles.includes(sf));
          await this.fileManager?.updateFilesMetaResourceIds(filesMetaToUpdate, resource.id);
        }
        continue;
      }

      const relationMetadata = this.relationMetadata(relation, modelName);
      const relationModelName = relationMetadata.type['name'];

      if (relationMetadata.isCascadeUpdate || relationMetadata.isCascadeInsert) {
        let referencedResources = await resource[relation];
        if (!referencedResources) {
          continue;
        }

        if (!Array.isArray(referencedResources)) {
          referencedResources = [referencedResources];
        }

        for (const referencedResource of referencedResources) {
          const referencedRepository: Repository<ResourceEntity> =
            this.repository.manager.getRepository(relationModelName);

          await this.updateFilesMetaResourceIds(storedFiles, referencedResource, referencedRepository);
        }
      }
    }
  }

  private async resourceFilesToDelete(
    resource: ResourceEntity,
    newResource: ResourceEntity,
    repository: Repository<ResourceEntity>
  ): Promise<string[]> {
    const modelName = repository.metadata?.name;
    const relations = this.relationFields(modelName);

    const filesToDelete = [];

    const fileFileds = this.fileFields(modelName);

    filesToDelete.push(...this.fileManager?.getFilesToDelete(this.fileProps(modelName), resource, newResource));

    for (const relation of relations) {
      if (fileFileds.includes(relation)) {
        continue;
      }

      const relationMetadata = this.relationMetadata(relation, modelName);
      const relationModelName = relationMetadata.type['name'];

      if (
        (relationMetadata.isOwning && relationMetadata.onDelete === 'CASCADE') ||
        (!relationMetadata.isOwning && relationMetadata.inverseRelation?.onDelete === 'CASCADE') ||
        relationMetadata.isCascadeRemove ||
        (newResource && (relationMetadata.isCascadeUpdate || relationMetadata.isCascadeRemove))
      ) {
        let referencedResources = await resource[relation];
        const currentReferencedResources = newResource?.[relation];
        if (!referencedResources) {
          continue;
        }

        if (!Array.isArray(referencedResources)) {
          referencedResources = [referencedResources];
        }

        for (const referencedResource of referencedResources) {
          const referencedRepository: Repository<ResourceEntity> =
            this.repository.manager.getRepository(relationModelName);

          const subFilesToDelete = await this.resourceFilesToDelete(
            referencedResource,
            Array.isArray(currentReferencedResources)
              ? currentReferencedResources.find((crr) => crr.id === referencedResource.id)
              : currentReferencedResources,
            referencedRepository
          );

          for (const deletedFile of subFilesToDelete) {
            filesToDelete.push(deletedFile);
          }
        }
      }
    }

    return filesToDelete;
  }

  private relationModelNames(modelName?: string, exclude: string[] = ['File', 'FileMeta']): string[] {
    const names: string[] = [];

    const relations = this.relationMetadataList(modelName);

    for (const metadata of Object.values(relations || {})) {
      const relationModelName = metadata.type['name'];
      if (exclude.includes(relationModelName) || names.includes(relationModelName)) {
        continue;
      }
      names.push(relationModelName);
      const childRelationNames = this.relationModelNames(relationModelName, [relationModelName, ...exclude]);
      names.push(...childRelationNames.filter((crn) => !names.includes(crn)));
    }

    return Array.from(new Set<string>(names));
  }

  private fields(modelName?: string): string[] {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]?.fields;
  }

  private relationFields(modelName?: string): string[] {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]?.relations;
  }

  private relationMetadata(fieldName: string, modelName?: string): RelationMetadata {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]?.relationMetadata?.[
      fieldName
    ];
  }

  private relationMetadataList(modelName?: string): Record<string, RelationMetadata> {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]?.relationMetadata;
  }

  private relationPopulation(fieldName: string, modelName?: string): PopulateRelationConfig {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]?.relationPopulation?.[
      fieldName
    ];
  }

  private relationPopulationList(modelName?: string): Record<string, PopulateRelationConfig> {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]?.relationPopulation;
  }

  private fileFields(modelName?: string): string[] {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]?.files;
  }

  private fileProps(modelName?: string): Record<string, FileProps> {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]?.fileProps;
  }

  private initRelationModelNames(): Record<string, string[]> {
    const relationModelNames: Record<string, string[]> = {};

    const repositories = this.repository?.manager?.['repositories'];
    if (!repositories) {
      return relationModelNames;
    }

    for (const repo of repositories.values()) {
      const name = repo.metadata?.name;
      relationModelNames[name] = this.relationModelNames(name);
      this.log.debug('%s relation names: %j', name, relationModelNames[name]);
    }

    return relationModelNames;
  }

  private initAllReferences(): Record<string, ModelReferences> {
    const referencesMap: Record<string, ModelReferences> = {};

    const repositories = this.repository?.manager?.['repositories'];
    if (!repositories) {
      return referencesMap;
    }

    for (const repo of repositories.values()) {
      referencesMap[repo.metadata.name] = this.makeReferences(repo);
    }

    return referencesMap;
  }

  private makeReferences(repository: Repository<any>): ModelReferences {
    const fields: string[] = [];
    const files: string[] = [];
    const relations: string[] = [];
    const relationMetadata: Record<string, RelationMetadata> = {};
    const relationPopulation: Record<string, PopulateRelationConfig> = {};
    let fileProps: Record<string, FileProps> = {};

    for (const field of Object.keys(repository.metadata?.propertiesMap || {})) {
      const props = Reflect.getMetadata(FILE_PROPS_KEY, repository.metadata.target?.['prototype']);

      fields.push(field);

      if (props && props[field]) {
        fileProps[field] = props[field];
        files.push(field);
      }
    }

    for (const relation of repository.metadata?.relations || []) {
      relations.push(relation.propertyName);
      relationMetadata[relation.propertyName] = relation;

      const relationProps = Reflect.getMetadata(POPULATE_RELATION_KEY, repository.metadata.target?.['prototype']);

      if (relationProps && relationProps[relation.propertyName]) {
        relationPopulation[relation.propertyName] = relationProps[relation.propertyName];
      }
    }

    this.log.debug('%s file fields: %j', repository.metadata?.name, files);
    this.log.debug('%s relation fields: %j', repository.metadata?.name, relations);
    this.log.debug('%s populate relation fields: %j', repository.metadata?.name, Object.keys(relationPopulation));

    return { fields, files, relations, relationMetadata, relationPopulation, fileProps };
  }

  private setRepository(repository: Repository<T & ResourceEntity>): void {
    this.repository = repository;
  }

  private setProtected(value: boolean): void {
    this.isProtected = value;
  }

  private setEntityManager(manager: EntityManager): void {
    this.entityManager = manager;
  }

  private setFileManager(fileManager: FileManager): void {
    this.fileManager = fileManager;
  }
}
