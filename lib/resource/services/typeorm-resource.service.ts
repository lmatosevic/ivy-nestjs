import { Logger } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { ResourceError } from '../../resource/errors';
import { FILE_PROPS_KEY, FileError, FileManager, FileProps } from '../../storage';
import { QueryRequest, QueryResponse } from '../dto';
import { ResourceService } from './resource.service';
import { ResourceEntity } from '../entity';
import { ResourcePolicyService } from '../policy';
import * as _ from 'lodash';

type ModelReferences = {
  files: string[];
  fileProps: Record<string, FileProps>;
};

export abstract class TypeOrmResourceService<T extends ObjectLiteral>
  extends ResourcePolicyService
  implements ResourceService<T>
{
  private static modelReferences: Record<string, ModelReferences>;
  private readonly logger = new Logger(TypeOrmResourceService.name);

  protected constructor(
    protected repository: Repository<T | ResourceEntity>,
    protected fileManager?: FileManager
  ) {
    super();

    if (!TypeOrmResourceService.modelReferences) {
      TypeOrmResourceService.modelReferences = this.fetchAllReferences();
    }
  }

  async find(id: number): Promise<T> {
    let result;

    try {
      result = await this.repository.findOneBy({ id });
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

    try {
      results = await this.repository.find({
        skip: options.skip,
        take: options.limit,
        order: options.sort as any,
        where: filter
      });
      totalCount = await this.repository.count({ where: filter });
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

  async create(createDto: any): Promise<T> {
    let model;
    let storedFiles;

    try {
      const createdEntity = this.repository.create(createDto) as any;
      storedFiles = await this.fileManager?.persistFiles(this.fileProps(), createdEntity);
      model = await this.repository.save(createdEntity);
      await this.fileManager?.updateFilesMetaResourceIds(storedFiles, model.id);
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

    return model;
  }

  async update(id: number, updateDto: any, isFileUpload?: boolean): Promise<T> {
    let resource = await this.find(id);
    const currentResource = _.cloneDeep(resource);

    resource = _.assign(resource, updateDto) as any;

    if (isFileUpload) {
      this.mergeFileArrays(currentResource, resource);
    }

    let updatedModel;
    let storedFiles;
    try {
      storedFiles = await this.fileManager?.persistFiles(
        this.fileProps(),
        resource,
        currentResource,
        isFileUpload
      );
      updatedModel = await this.repository.save(resource);
      await this.fileManager?.deleteFiles(this.fileProps(), currentResource, updatedModel);
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

  async delete(id: number): Promise<T> {
    const resource = await this.find(id);

    let removedModel;
    try {
      removedModel = await this.repository.remove(resource);
      await this.fileManager?.deleteFiles(this.fileProps(), removedModel);
    } catch (e) {
      this.logger.debug(e);
      throw new ResourceError(this.repository.metadata.name, {
        message: e.message,
        reason: e.detail,
        status: e.constraint ? 400 : 500
      });
    }

    return removedModel;
  }

  private mergeFileArrays(currentResource: any, resource: any): void {
    for (const fileField of this.fileFields()) {
      const fileValue = currentResource[fileField];
      if (Array.isArray(fileValue) && fileValue.length > 0) {
        resource[fileField] = [...fileValue, ...resource[fileField]];
      }
    }
  }

  private fileFields(modelName?: string): string[] {
    const name = modelName || this.repository.metadata.name;
    return TypeOrmResourceService.modelReferences[name]?.files;
  }

  private fileProps(modelName?: string): Record<string, FileProps> {
    const name = modelName || this.repository.metadata.name;
    return TypeOrmResourceService.modelReferences[name]?.fileProps;
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
    const files: string[] = [];
    let fileProps: Record<string, FileProps> = {};

    for (const field of Object.keys(repository.metadata?.propertiesMap || {})) {
      const props = Reflect.getMetadata(FILE_PROPS_KEY, repository.metadata.target?.['prototype']);
      if (props && props[field]) {
        fileProps[field] = props[field];
        files.push(field);
      }
    }

    this.logger.debug('%s file fields: %j', repository.metadata.name, files);

    return { files, fileProps };
  }
}