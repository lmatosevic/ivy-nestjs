import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('Date', () => Date)
export class DateScalar implements CustomScalar<string, Date> {
  description = 'A date-time string at UTC, such as 2022-08-27T09:54:281Z, compliant with the date-time format.';

  parseValue(value: number | string): Date {
    return new Date(value);
  }

  serialize(value: Date): string {
    return new Date(value).toISOString();
  }

  parseLiteral(ast: ValueNode): Date {
    if (ast.kind === Kind.INT || ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  }
}
