import { InputType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';

@InputType()
export class ValidationError {
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }]
  })
  value: string | number | boolean;

  property: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      allOf: [{ type: 'string' }]
    }
  })
  constraints: Record<string, any>;

  @ApiProperty({ type: () => [ValidationError] })
  children?: ValidationError[];
}
