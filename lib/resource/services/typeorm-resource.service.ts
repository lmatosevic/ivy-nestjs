import { Logger } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { ResourceError } from '../../resource/errors';
import { FileManager } from '../../storage';
import { QueryRequest, QueryResponse } from '../dto';
import { ResourceService } from './resource.service';
import { ResourceEntity } from '../entity';
import { ResourcePolicyService } from '../policy';

export abstract class TypeOrmResourceService<T extends ObjectLiteral>
  extends ResourcePolicyService
  implements ResourceService<T>
{
  private readonly logger = new Logger(TypeOrmResourceService.name);

  protected constructor(
    protected repository: Repository<T | ResourceEntity>,
    protected fileManager?: FileManager
  ) {
    super();
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
    let entity;
    try {
      const createdEntity = this.repository.create(createDto) as any;
      entity = await this.repository.save(createdEntity);
    } catch (e) {
      this.logger.debug(e);
      throw new ResourceError(this.repository.metadata.name, {
        message: e.message,
        reason: e.detail,
        status: e.constraint ? 400 : 500
      });
    }

    return entity;
  }

  async update(id: number, updateDto: any, isFileUpload?: boolean): Promise<T> {
    const result = await this.find(id);

    let updatedEntity;
    try {
      const entity = this.repository.merge(result, updateDto) as any;
      updatedEntity = await this.repository.save(entity);
    } catch (e) {
      this.logger.debug(e);
      throw new ResourceError(this.repository.metadata.name, {
        message: e.message,
        reason: e.detail,
        status: e.constraint ? 400 : 500
      });
    }

    return updatedEntity;
  }

  async delete(id: number): Promise<T> {
    const result = await this.find(id);

    let deletedEntity;
    try {
      deletedEntity = await this.repository.remove(result);
    } catch (e) {
      this.logger.debug(e);
      throw new ResourceError(this.repository.metadata.name, {
        message: e.message,
        reason: e.detail,
        status: e.constraint ? 400 : 500
      });
    }

    return deletedEntity;
  }
}
