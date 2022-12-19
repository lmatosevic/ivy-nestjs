import { ConfigService } from '@nestjs/config';
import { AggregateRequest, AggregateResponse, QueryRequest, QueryResponse, StatusResponse } from '../dto';

export interface IResourceResolver<T, C, U> {
  find(id: string | number): Promise<T>;

  query(queryOptions: QueryRequest<T>, config: ConfigService): Promise<QueryResponse<T>>;

  aggregate(aggregateOptions: AggregateRequest<T>): Promise<AggregateResponse<T>>;

  create(createDto: C): Promise<T>;

  update(id: string | number, updateDto: U): Promise<T>;

  delete(id: string | number): Promise<T>;

  createBulk(createDtos: C[], config: ConfigService): Promise<T[]>;

  updateBulk(updateDtos: U[], config: ConfigService): Promise<T[]>;

  deleteBulk(ids: (string | number)[], config: ConfigService): Promise<T[]>;

  unlink(deleteFiles: Record<string, string | string[]>): Promise<StatusResponse>;
}
