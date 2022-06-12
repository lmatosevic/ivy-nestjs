import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ContextUtil, StringUtil } from '../utils';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggerInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = ContextUtil.normalizeContext(context);
    const request = ctx.switchToHttp().getRequest();
    const handler = ctx.getHandler();

    this.logger.verbose(
      '[%s] %s %s%s => %j',
      handler?.name,
      request.method,
      request.originalUrl,
      ContextUtil.isGraphQL(context) ? ' {' + ctx.switchToHttp()['args'][3]?.['fieldName'] + '}' : '',
      {
        body: StringUtil.sanitizeData(request.body),
        query: StringUtil.sanitizeData(request.query),
        params: StringUtil.sanitizeData(request.params),
        headers: StringUtil.sanitizeData(request.headers),
        userId: request.user?.id,
        userRoles: Array.isArray(request.user?.roles) ? request.user?.roles : request.user?.role
      }
    );

    const startTime = Date.now();

    // prettier-ignore
    return next.handle()
      .pipe(
        tap(() => {
          const resp = ctx.switchToHttp().getResponse();
          this.logger.verbose('[%s] %s %s +%dms',
            handler?.name,
            resp.statusCode || 200,
            !resp.statusCode || resp.statusCode < 400 ? 'OK' : 'ERROR',
            Date.now() - startTime
          );
        })
      );
  }
}
