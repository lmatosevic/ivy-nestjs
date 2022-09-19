import { PartialDeep } from 'type-fest';
import { AggregateRequest, AggregateResponse, QueryRequest, QueryResponse } from '../dto';

export interface ResourceService<T> {
  startTransaction?(...options: any[]): Promise<any>;

  useWith?(sessionManager: any): ResourceService<T>;

  asProtected?(): ResourceService<T>;

  find(id: string | number): Promise<T>;

  query(queryDto: QueryRequest<T>): Promise<QueryResponse<T>>;

  aggregate(aggregateDto: AggregateRequest<T>): Promise<AggregateResponse<T>>;

  create(createDto: PartialDeep<T>): Promise<T>;

  createBulk(createDtos: PartialDeep<T>[]): Promise<T[]>;

  update(id: string | number, updateDto: PartialDeep<T>, isFileUpload?: boolean): Promise<T>;

  updateBulk(updateDtos: PartialDeep<T>[]): Promise<T[]>;

  delete(id: string | number): Promise<T>;

  deleteBulk(ids: (string | number)[]): Promise<T[]>;
}
