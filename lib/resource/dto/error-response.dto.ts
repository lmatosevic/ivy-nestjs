import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { ValidationError } from './validation-error.dto';

@ApiExtraModels(ValidationError)
export class ErrorResponse {
  timestamp: string;

  path: string;

  message: string;

  code: number;

  @ApiProperty({
    oneOf: [
      { type: 'string' },
      {
        type: 'array',
        items: {
          $ref: getSchemaPath(ValidationError)
        }
      }
    ]
  })
  reason: string | ValidationError[];
}
