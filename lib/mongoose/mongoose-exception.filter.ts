import { ArgumentsHost, Catch, ExceptionFilter, Inject, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { MongoError } from 'mongodb';
import { FiltersModuleOptions } from '../filters';
import { FILTERS_MODULE_OPTIONS } from '../filters/filters.constants';

@Catch(MongoError)
export class MongooseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MongooseExceptionFilter.name);
  private readonly debug: boolean;

  constructor(
    @Optional() @Inject(FILTERS_MODULE_OPTIONS) private filtersModuleOptions: FiltersModuleOptions,
    private configService: ConfigService
  ) {
    this.debug = filtersModuleOptions?.debug ?? configService.get('app.debug') ?? false;
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
