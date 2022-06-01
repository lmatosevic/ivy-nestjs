import { ExecutionContext } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { GqlExecutionContext } from '@nestjs/graphql';

export class ContextUtil {
  static normalizeContext(context: ExecutionContext): ExecutionContext {
    let ctx = context;

    if (this.isGraphQL(context)) {
      const gqlCtx = GqlExecutionContext.create(context);
      ctx = new ExecutionContextHost(
        [gqlCtx.getContext().req, ...gqlCtx['args']?.filter((arg) => !!arg)],
        gqlCtx['constructorRef'],
        gqlCtx.getHandler()
      );
    }

    return ctx;
  }

  static isGraphQL(ctx: ExecutionContext): boolean {
    return (ctx.getType() as string) === 'graphql';
  }
}
