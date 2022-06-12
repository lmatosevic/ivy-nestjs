import { Logger, LoggerOptions, QueryRunner } from 'typeorm';
import { Logger as NestjsLogger } from '@nestjs/common';

export class TypeOrmLogger implements Logger {
  private static logger = new NestjsLogger(TypeOrmLogger.name);

  constructor(private options?: LoggerOptions) {}

  log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner): any {
    if (this.shouldLog(level)) {
      TypeOrmLogger.logger[level]?.(message);
    }
  }

  logMigration(message: string, queryRunner?: QueryRunner): any {
    if (this.shouldLog('info', 'migration')) {
      TypeOrmLogger.logger.debug?.(message);
    }
  }

  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): any {
    if (this.shouldLog('info', 'query')) {
      TypeOrmLogger.logger.debug?.(query + '; parameters: %j', parameters || []);
    }
  }

  logQueryError(error: string | Error, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
    if (this.shouldLog('error', 'query')) {
      TypeOrmLogger.logger.debug?.(query + '; parameters: %j', parameters || []);
      TypeOrmLogger.logger.error?.(error);
    }
  }

  logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
    if (this.shouldLog('warn', 'query')) {
      TypeOrmLogger.logger.warn?.('SLOW QUERY: ' + query + '; parameters: %j; time: %d', parameters || [], time);
    }
  }

  logSchemaBuild(message: string, queryRunner?: QueryRunner): any {
    if (this.shouldLog('info', 'schema')) {
      TypeOrmLogger.logger.debug?.(message);
    }
  }

  private shouldLog(
    level?: 'log' | 'info' | 'warn' | 'error',
    method?: 'query' | 'error' | 'schema' | 'migration'
  ): boolean {
    if (!this.options) {
      return false;
    }

    return (
      this.options === true ||
      this.options === 'all' ||
      (Array.isArray(this.options) && this.options.includes(level)) ||
      (Array.isArray(this.options) && this.options.includes(method))
    );
  }
}
