import { QueryRequest, QueryResponse } from '../dto';

export interface ResourceService<T> {
  find(id: string | number): Promise<T>;

  query(queryDto: QueryRequest<T>): Promise<QueryResponse<T>>;

  create(createDto: any): Promise<T>;

  update(id: string | number, updateDto: any, isFileUpload?: boolean): Promise<T>;

  delete(id: string | number): Promise<T>;
}
