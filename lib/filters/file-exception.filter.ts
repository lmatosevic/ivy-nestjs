import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { FileError } from '../storage';

@Catch(FileError)
export class FileExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(FileExceptionFilter.name);

  catch(exception: FileError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const data = {
      timestamp: new Date().toISOString(),
      path: request?.url || ctx['args'][3]?.['fieldName'],
      message: exception.message || 'Server error',
      code: exception.code || 500,
      reason: exception.reason || undefined
    };

    this.logger[data.code < 500 ? 'verbose' : 'error']('%j', data);

    response.status?.(data.code).json(data);
  }
}
