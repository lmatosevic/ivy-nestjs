import { ExceptionFilter, Catch, ArgumentsHost, Logger, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';
import { FiltersModuleOptions } from './filters.module';
import { FILTERS_MODULE_OPTIONS } from './filters.constants';

@Catch(MongoError)
export class MongoExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MongoExceptionFilter.name);
  private readonly debug: boolean;

  constructor(@Inject(FILTERS_MODULE_OPTIONS) private filtersModuleOptions: FiltersModuleOptions) {
    this.debug = filtersModuleOptions.debug ?? false;
  }

  catch(exception: MongoError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const data = {
      timestamp: new Date().toISOString(),
      path: request?.url || ctx['args'][3]?.['fieldName'],
      message: this.debug ? exception.message : 'Internal server error',
      code: exception.code,
      reason: this.debug ? 'MongoDB engine failed to perform required operations' : undefined
    };

    this.logger.error('%j', data);

    response.status?.(500).json(data);
  }
}
