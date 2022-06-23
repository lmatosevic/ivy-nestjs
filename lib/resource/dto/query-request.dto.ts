import { Document, FilterQuery } from 'mongoose';
import { Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryRequest<T> {
  readonly filter?: FilterQuery<T & Document>;

  @Min(1)
  page?: number;

  @Min(0)
  size?: number;

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
