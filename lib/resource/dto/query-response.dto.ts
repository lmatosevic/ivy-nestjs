import { ApiProperty } from '@nestjs/swagger';

export class QueryResponse<T> {
  resultCount: number;

  totalCount: number;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object'
    }
  })
  items: T[];
}
