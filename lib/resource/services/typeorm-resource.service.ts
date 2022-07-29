import { Logger } from '@nestjs/common';
import { Brackets, EntityManager, NotBrackets, Repository } from 'typeorm';
import { PartialDeep } from 'type-fest';
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata';
import { ResourceError } from '../../resource/errors';
import { FILE_PROPS_KEY, FileError, FileManager, FileProps } from '../../storage';
import { POPULATE_RELATION_KEY, PopulateRelationConfig } from '../decorators';
import { QueryRequest, QueryResponse } from '../dto';
import { FilesUtil, ObjectUtil, RequestUtil } from '../../utils';
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
  leftJoinAndSelect: Record<string, string>;
  innerJoin: Record<string, string>;
};

export abstract class TypeOrmResourceService<T extends ResourceEntity>
  extends ResourcePolicyService
  implements ResourceService<T>
{
  private static modelReferences: Record<string, ModelReferences>;
  private readonly logger = new Logger(TypeOrmResourceService.name);

  protected constructor(
    protected repository: Repository<T & ResourceEntity>,
    protected fileManager?: FileManager,
    private entityManager?: EntityManager
  ) {
    super('id');

    if (!TypeOrmResourceService.modelReferences) {
      TypeOrmResourceService.modelReferences = this.fetchAllReferences();
    }
  }

  public useWith(sessionManager: EntityManager): ResourceService<T> {
    class ManagedTypeOrmResourceService extends TypeOrmResourceService<T> {}

    const repository: Repository<T & ResourceEntity> = sessionManager.getRepository(
      this.repository.metadata.name
    );
    return new ManagedTypeOrmResourceService(repository, this.fileManager, sessionManager);
  }

  async find(id: string | number): Promise<T> {
    let result;

    try {
      const filter = { id };

      result = await this.repository.findOne({
        where: filter,
        select: this.policyProjection(),
        join: this.buildJoinRelations(filter),
        transaction: !this.entityManager
      } as any);
    } catch (e) {
      this.logger.debug(e);
      throw new ResourceError(this.repository.metadata.name, {
        message: 'Bad request',
        reason: e.message,
        status: 400
      });
    }

    if (!result) {
      throw new ResourceError(this.repository.metadata.name, {
        message: 'Not Found',
        status: 404
      });
    }

    return result as T;
  }

  async query(queryDto: QueryRequest<T>): Promise<QueryResponse<T>> {
    let { filter, ...options } = queryDto;
    let results;
    let totalCount;

    filter = _.merge(filter || {}, this.policyFilter());

    if (options?.sort) {
      options.sort = RequestUtil.normalizeSort(options.sort);
    }

    let repository = this.repository;
    let queryRunner;
    if (!this.entityManager) {
      queryRunner = this.repository.metadata.connection.createQueryRunner();
      repository = queryRunner.manager.getRepository(this.repository.metadata.name);

      await queryRunner.connect();
      await queryRunner.startTransaction();
    }

    try {
      const joins = this.buildJoinRelations(filter, false);
      const modelAlias = joins.alias;

      if (Object.keys(filter).length > 0) {
        filter = RequestUtil.transformTypeormFilter(filter, repository.metadata.name);
        this.logger.debug('Transformed filter: %j', filter);
      }

      const whereQuery = this.buildWhereQuery(filter, joins);

      const queryBuilder = repository.createQueryBuilder(modelAlias).where(whereQuery);

      for (const [alias, path] of Object.entries(joins.leftJoinAndSelect)) {
        if (this.isInternal()) {
          queryBuilder.leftJoin(path, alias);
        } else {
          queryBuilder.leftJoinAndSelect(path, alias);
        }
      }

      for (const [alias, path] of Object.entries(joins.innerJoin)) {
        queryBuilder.innerJoin(path, alias);
      }

      for (const [sort, order] of Object.entries(options.sort || {})) {
        queryBuilder.addOrderBy(modelAlias + '.' + sort, order.toUpperCase());
      }

      results = await queryBuilder
        .skip((options.page - 1) * options.size || 0)
        .take(options.size)
        .getMany();

      const countQueryBuilder = repository.createQueryBuilder().where(whereQuery);

      for (const [alias, path] of Object.entries(joins.leftJoinAndSelect)) {
        countQueryBuilder.leftJoin(path, alias);
      }

      for (const [alias, path] of Object.entries(joins.innerJoin)) {
        countQueryBuilder.innerJoin(path, alias);
      }

      totalCount = await countQueryBuilder.getCount();

      if (!this.entityManager) {
        await queryRunner.commitTransaction();
      }
    } catch (e) {
      if (!this.entityManager) {
        await queryRunner.rollbackTransaction();
      }
      this.logger.debug(e);
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

  async create(createDto: PartialDeep<T>): Promise<T> {
    let createdModel;
    let storedFiles;

    let model = this.repository.create(createDto as any) as any;
    if (!model.createdBy && this.fields().includes('createdBy')) {
      model.createdBy = this.getAuthUser()?.getId();
    }

    model = _.assign(model, createDto) as any;

    try {
      storedFiles = await this.persistResourceFiles(
        model,
        null,
        false,
        this.repository as Repository<ResourceEntity>
      );

      createdModel = await this.repository.save(model);

      await this.updateFilesMetaResourceIds(
        storedFiles,
        createdModel,
        this.repository as Repository<ResourceEntity>
      );
    } catch (e) {
      this.logger.debug(e);
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

    return this.find(createdModel.id);
  }

  async update(id: string | number, updateDto: PartialDeep<T>, isFileUpload?: boolean): Promise<T> {
    let updatedModel;
    let storedFiles;

    let resource = await this.find(id);
    const currentResource = _.cloneDeep(resource);

    resource = _.assign(resource, updateDto) as any;

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

      await this.updateFilesMetaResourceIds(
        storedFiles,
        updatedModel,
        this.repository as Repository<ResourceEntity>
      );

      const filesToDelete = await this.resourceFilesToDelete(
        currentResource,
        updatedModel,
        this.repository as Repository<ResourceEntity>
      );
      await this.fileManager?.deleteFileArray(filesToDelete);
    } catch (e) {
      this.logger.debug(e);
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

    return this.find(updatedModel.id);
  }

  async delete(id: string | number): Promise<T> {
    const resource = await this.find(id);
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
      this.logger.debug(e);
      throw new ResourceError(this.repository.metadata.name, {
        message: e.message,
        reason: e.detail,
        status: e.constraint ? 400 : 500
      });
    }

    return currentResource;
  }

  private buildWhereQuery(filter: any, joins: JoinOptions, isNot?: boolean): Brackets | NotBrackets {
    const brackets = isNot ? NotBrackets : Brackets;

    return new brackets((qb) => {
      let first = true;
      for (const [key, value] of Object.entries(filter)) {
        let whereKey = first ? 'where' : 'andWhere';

        // Map AND & OR operators using recursive brackets expressions
        if (RequestUtil.filterQueryBrackets.includes(key) && Array.isArray(value)) {
          for (const operator of value) {
            const whereType = key === '_and' ? 'andWhere' : 'orWhere';
            whereKey = first ? 'where' : whereType;
            switch (key) {
              case '_and':
                qb[whereKey](this.buildWhereQuery(operator, joins));
                break;
              case '_or':
                qb[whereKey](this.buildWhereQuery(operator, joins, false));
                break;
              case '_nor':
                qb[whereKey](this.buildWhereQuery(operator, joins, true));
                break;
            }
            first = false;
          }
          continue;
        }

        // Add where statements for entity properties with single or multiple values and replace left join alias with
        // inner join alias to prevent data exclusion from array relations
        if (!RequestUtil.filterQueryKeys.includes(key) && Array.isArray(value)) {
          if (value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'object') {
            let statement = this.replaceInnerJoinAlias(value[0], joins);
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
                let statement = this.replaceInnerJoinAlias(operatorValue[0], joins);
                qb[whereKey](statement, operatorValue[1]);
                first = false;
              }
            }
          }
          continue;
        }

        // Recursively traverse nested relation property map
        if (!RequestUtil.filterQueryKeys.includes(key) && typeof value === 'object') {
          qb[whereKey](this.buildWhereQuery(value, joins, isNot));
          first = false;
        }
      }
    });
  }

  private replaceInnerJoinAlias(statement: string, joins: JoinOptions): string {
    const joinAlias = Object.entries(joins.leftJoinAndSelect).find(([k, v]) => statement.startsWith(k + '.'));
    if (joinAlias) {
      const innerJoinAlias = Object.entries(joins.innerJoin).find(([k, v]) => v === joinAlias[1]);
      if (innerJoinAlias) {
        statement = statement.replace(joinAlias[0], innerJoinAlias[0]);
      }
    }
    return statement;
  }

  private buildJoinRelations(
    filter?: any,
    single: boolean = true
  ): {
    alias: string;
    leftJoinAndSelect: Record<string, string>;
    innerJoin: Record<string, string>;
  } {
    let relations = this.relationsToPopulate(single);
    const modelName = this.repository.metadata.name;
    const joinOptions = { alias: modelName, leftJoinAndSelect: {}, innerJoin: {} };

    const filterKeys = ObjectUtil.nestedKeys(filter, RequestUtil.filterQueryKeys);
    if (this.isInternal() && filter) {
      relations = relations.filter((r) => filterKeys.includes(r.name));
    }

    for (const relation of relations) {
      const relationParts = relation.name.split('.');

      const { alias, path } = this.makeAliasAndPath(relationParts, modelName);
      if (alias && path) {
        joinOptions.leftJoinAndSelect[alias] = path;
      }

      // Inner join statements are used to separate data selection from where query filtering
      if (alias && path && relation.isMany && filterKeys.includes(relation.name)) {
        joinOptions.innerJoin[`${alias}__${modelName}`] = path;
      }
    }

    // Add all relations excluded from population but used in where query as inner join statements
    const filterRelations = this.filterAliasAndPaths(filterKeys, modelName);
    for (const filterRelation of filterRelations) {
      const { alias, path } = filterRelation;
      if (
        alias &&
        path &&
        path !== 'File.meta' &&
        !joinOptions.leftJoinAndSelect[alias] &&
        !joinOptions.innerJoin[alias]
      ) {
        joinOptions.innerJoin[alias] = path;
      }
    }

    this.logger.debug('Join options: %j', joinOptions);

    return joinOptions;
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

  private filterAliasAndPaths(filterKeys: string[], modelName: string): { alias: string; path: string }[] {
    const items = [];

    for (const filterKey of filterKeys) {
      const relationMetadata = this.relationMetadata(filterKey, modelName);

      if (relationMetadata) {
        const relationModelName = relationMetadata.type['name'];
        const { alias, path } = this.makeAliasAndPath(filterKey.split('.'), modelName);
        if (alias && path) {
          items.push({ alias, path });
        }

        items.push(
          ...this.filterAliasAndPaths(
            filterKeys
              .filter((fk) => fk.startsWith(filterKey + '.'))
              .map((fk) => fk.replace(filterKey + '.', '')),
            relationModelName
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
  ): { name: string; isMany?: boolean }[] {
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

      const subRelationMetadata = this.relationMetadata(relation, modelName);

      fields.push({
        name: relation,
        isMany: subRelationMetadata.isOneToMany || subRelationMetadata.isManyToMany
      });

      if (config.populateChildren !== false && config.maxDepth > 0) {
        const subRelationModelName = subRelationMetadata.type['name'];

        if (level >= config.maxDepth) {
          continue;
        }

        let subRelations = [];
        if (!config.includeRelations && (!config.excludeRelations || config.excludeRelations?.length > 0)) {
          subRelations = this.relationsToPopulate(
            single,
            subRelationModelName,
            level + 1,
            config.excludeRelations
          );
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
              isMany: sr.isMany
            }))
            .filter((f) => !excludeFields?.includes(f.name))
        );
      }
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
    storedFiles.push(...fileNames);

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

          storedFiles.push(...storedSubReferenceFiles);
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

    filesToDelete.push(
      ...this.fileManager?.getFilesToDelete(this.fileProps(modelName), resource, newResource)
    );

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

          filesToDelete.push(...subFilesToDelete);
        }
      }
    }

    return filesToDelete;
  }

  private fields(modelName?: string): string[] {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]?.fields;
  }

  private relationFields(modelName?: string): string[] {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]?.relations;
  }

  private relationMetadata(fieldName: string, modelName?: string): RelationMetadata {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]
      ?.relationMetadata?.[fieldName];
  }

  private relationMetadataList(modelName?: string): Record<string, RelationMetadata> {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]
      ?.relationMetadata;
  }

  private relationPopulation(fieldName: string, modelName?: string): PopulateRelationConfig {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]
      ?.relationPopulation?.[fieldName];
  }

  private relationPopulationList(modelName?: string): Record<string, PopulateRelationConfig> {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]
      ?.relationPopulation;
  }

  private fileFields(modelName?: string): string[] {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]?.files;
  }

  private fileProps(modelName?: string): Record<string, FileProps> {
    return TypeOrmResourceService.modelReferences[modelName || this.repository.metadata.name]?.fileProps;
  }

  private fetchAllReferences(): Record<string, ModelReferences> {
    const referencesMap: Record<string, ModelReferences> = {};

    const repositories = this.repository?.manager?.['repositories'];
    if (!repositories) {
      return referencesMap;
    }

    for (const repo of repositories) {
      referencesMap[repo.metadata.name] = this.fetchReferences(repo);
    }

    return referencesMap;
  }

  private fetchReferences(repository: Repository<any>): ModelReferences {
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

      const relationProps = Reflect.getMetadata(
        POPULATE_RELATION_KEY,
        repository.metadata.target?.['prototype']
      );

      if (relationProps && relationProps[relation.propertyName]) {
        relationPopulation[relation.propertyName] = relationProps[relation.propertyName];
      }
    }

    this.logger.debug('%s file fields: %j', repository.metadata?.name, files);
    this.logger.debug('%s relation fields: %j', repository.metadata?.name, relations);
    this.logger.debug(
      '%s populate relation fields: %j',
      repository.metadata?.name,
      Object.keys(relationPopulation)
    );

    return { fields, files, relations, relationMetadata, relationPopulation, fileProps };
  }
}
