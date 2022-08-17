import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { AccountError, AuthorizationError } from '../auth';

@Catch(AuthorizationError, AccountError)
export class AuthorizationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthorizationExceptionFilter.name);

  catch(exception: AuthorizationError | AccountError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const data = {
      timestamp: new Date().toISOString(),
      path: request?.url || ctx['args'][3]?.['fieldName'],
      message: exception.message || 'Authorization error',
      code: exception.code || 500,
      reason: exception.error?.message || undefined
    };

    this.logger[data.code < 500 ? 'verbose' : 'error']('%j', data);

    response.status?.(data.code).json(data);
  }
}
