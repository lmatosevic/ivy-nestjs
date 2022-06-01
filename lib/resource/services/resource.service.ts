import { QueryRequest, QueryResponse } from '../dto';

export interface ResourceService<T> {
  find(id: string): Promise<T>;

  query(queryDto: QueryRequest<T>): Promise<QueryResponse<T>>;

  create(createDto: any): Promise<T>;

  update(id: string, updateDto: any, isFileUpload?: boolean): Promise<T>;

  delete(id: string): Promise<T>;
}
