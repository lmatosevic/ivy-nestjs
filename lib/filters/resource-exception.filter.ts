import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ResourceError } from '../resource';

@Catch(ResourceError)
export class ResourceExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ResourceExceptionFilter.name);

  catch(exception: ResourceError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const data = {
      timestamp: new Date().toISOString(),
      path: request?.url || ctx['args'][3]?.['fieldName'],
      message: exception.data?.message || 'Server error',
      code: exception.data?.status || 500,
      reason: exception.data?.reason || undefined
    };

    this.logger[data.code < 500 ? 'verbose' : 'error']('%j', data);

    response.status?.(exception.data?.status || 500).json(data);
  }
}
