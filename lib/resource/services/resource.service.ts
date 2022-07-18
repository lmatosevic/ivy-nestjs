import { PartialDeep } from 'type-fest';
import { QueryRequest, QueryResponse } from '../dto';

export interface ResourceService<T> {
  find(id: string | number): Promise<T>;

  query(queryDto: QueryRequest<T>): Promise<QueryResponse<T>>;

  create(createDto: PartialDeep<T>): Promise<T>;

  update(id: string | number, updateDto: PartialDeep<T>, isFileUpload?: boolean): Promise<T>;

  delete(id: string | number): Promise<T>;
}
