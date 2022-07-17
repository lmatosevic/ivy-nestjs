import { Document, FilterQuery } from 'mongoose';
import { IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryRequest<T> {
  @IsOptional()
  readonly filter?: FilterQuery<T & Document>;

  @Min(1)
  @IsOptional()
  page?: number;

  @Min(0)
  @IsOptional()
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
  @IsOptional()
  sort?: string | Record<string, number | string>;
}
