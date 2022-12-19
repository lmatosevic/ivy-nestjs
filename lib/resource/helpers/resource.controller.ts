import { ConfigService } from '@nestjs/config';
import { AggregateRequest, AggregateResponse, QueryRequest, QueryResponse, StatusResponse } from '../dto';

export interface IResourceController<T, C, U> {
  find(id: string | number): Promise<T>;

  queryGet(config: ConfigService, sortParam?: string, queryDto?: QueryRequest<T>): Promise<QueryResponse<T>>;

  query(queryDto: QueryRequest<T>, config: ConfigService): Promise<QueryResponse<T>>;

  aggregateGet(aggregateParams: Record<string, any>): Promise<AggregateResponse<T>>;

  aggregate(aggregateDto: AggregateRequest<T>): Promise<AggregateResponse<T>>;

  create(createDto: C): Promise<T>;

  update(id: string | number, updateDto: U): Promise<T>;

  delete(id: string | number): Promise<T>;

  createBulk(createDtos: C[], config: ConfigService): Promise<T[]>;

  updateBulk(updateDtos: U[], config: ConfigService): Promise<T[]>;

  deleteBulk(ids: (string | number)[], config: ConfigService): Promise<T[]>;

  upload(
    id: string | number,
    files: Record<string, Express.Multer.File[]>
  ): Promise<Record<string, string | string[]>>;

  unlink(id: string | number, deleteDto: Record<string, string | string[]>): Promise<StatusResponse>;
}
