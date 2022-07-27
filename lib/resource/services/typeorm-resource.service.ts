import { Logger } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { PartialDeep } from 'type-fest';
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata';
import { ResourceError } from '../../resource/errors';
import { FILE_PROPS_KEY, FileError, FileManager, FileProps } from '../../storage';
import { POPULATE_RELATION_KEY, PopulateRelationConfig } from '../decorators';
import { QueryRequest, QueryResponse } from '../dto';
import { FilesUtil, RequestUtil } from '../../utils';
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

export abstract class TypeOrmResourceService<T extends ResourceEntity>
  extends ResourcePolicyService
  implements ResourceService<T>
{
  private static modelReferences: Record<string, ModelReferences>;
  private readonly logger = new Logger(TypeOrmResourceService.name);

  protected constructor(
    protected repository: Repository<T & ResourceEntity>,
    protected fileManager?: FileManager
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
    return new ManagedTypeOrmResourceService(repository, this.fileManager);
  }

  async find(id: string | number): Promise<T> {
    let result;

    try {
      result = await this.repository.findOne({
        where: { id },
        select: this.policyProjection(),
        relations: this.relationsToPopulate()
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

    if (Object.keys(filter).length > 0) {
      filter = RequestUtil.transformTypeormFilter(filter);
    }

    if (options?.sort) {
      options.sort = RequestUtil.normalizeSort(options.sort);
    }

    try {
      const result = await this.repository.findAndCount({
        skip: (options.page - 1) * options.size || 0,
        take: options.size,
        order: options.sort as any,
        where: filter as any,
        select: this.policyProjection(),
        relations: this.relationsToPopulate(),
        transaction: true
      });
      results = result[0];
      totalCount = result[1];
    } catch (e) {
      this.logger.debug(e);
      throw new ResourceError(this.repository.metadata.name, {
        message: 'Bad request',
        reason: e.message,
        status: 400
      });
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

  private relationsToPopulate(modelName?: string, level: number = 0, excludeFields: string[] = []): string[] {
    const fields = [];

    const relationPopulation = this.relationPopulationList(modelName);

    for (const [relation, config] of Object.entries(relationPopulation || {})) {
      if (excludeFields && excludeFields.includes(relation)) {
        continue;
      }

      fields.push(relation);

      if (config.populateChildren !== false && config.maxDepth > 0) {
        const subRelationMetadata = this.relationMetadata(relation, modelName);
        const subRelationModelName = subRelationMetadata.type['name'];

        if (level >= config.maxDepth) {
          continue;
        }

        let subRelations = [];
        if (!config.includeRelations && (!config.excludeRelations || config.excludeRelations?.length > 0)) {
          subRelations = this.relationsToPopulate(subRelationModelName, level + 1, config.excludeRelations);
        } else if (config.includeRelations?.length > 0) {
          const subRelationFields = this.relationFields(subRelationModelName);
          subRelations = this.relationsToPopulate(
            subRelationModelName,
            level + 1,
            subRelationFields.filter((srf) => !config.includeRelations.includes(srf))
          );
        } else {
          subRelations = this.relationFields(subRelationModelName);
        }

        fields.push(
          ...subRelations.map((sr) => `${relation}.${sr}`).filter((f) => !excludeFields?.includes(f))
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
