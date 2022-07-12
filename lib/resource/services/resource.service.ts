import { QueryRequest, QueryResponse } from '../dto';

export interface ResourceService<T> {
  find(id: string | number): Promise<T>;

  query(queryDto: QueryRequest<T>): Promise<QueryResponse<T>>;

  create(createDto: Partial<T & any>): Promise<T>;

  update(id: string | number, updateDto: Partial<T & any>, isFileUpload?: boolean): Promise<T>;

  delete(id: string | number): Promise<T>;
}
