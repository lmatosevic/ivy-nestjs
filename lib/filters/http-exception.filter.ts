import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode = exception.getStatus() || 500;
    const resp = exception.getResponse();
    const data = {
      timestamp: new Date().toISOString(),
      path: request?.url || ctx['args'][3]?.['fieldName'],
      message: resp?.['error'] || statusCode < 500 ? 'Bad Request' : 'Server error',
      code: statusCode,
      reason: resp?.['message'] || exception.message || undefined
    };

    this.logger[statusCode < 500 ? 'verbose' : 'error']('%j', data);

    response.status?.(statusCode).json(data);
  }
}
