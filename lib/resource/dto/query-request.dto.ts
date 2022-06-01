import { Document, FilterQuery } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export class QueryRequest<T> {
  readonly filter?: FilterQuery<T & Document>;

  skip?: number;

  limit?: number;

  @ApiProperty({
    oneOf: [
      { type: 'string' },
      {
        type: 'object',
        additionalProperties: {
          oneOf: [{ type: 'number' }, { type: 'string' }]
        }
      }
    ]
  })
  sort?: string | Record<string, number | string>;
}
