import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mongoose from 'mongoose';

@Injectable()
export class MongooseLoggerService implements OnModuleInit {
  private readonly logger = new Logger(MongooseLoggerService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
    const logging = this.configService.get<boolean | string | string[]>('db.logging');
    const debug = this.configService.get<boolean>('app.debug');
    if (debug && logging !== false && (logging === 'all' || (Array.isArray(logging) && logging.length > 0))) {
      mongoose.set('debug', (collectionName, method, query, doc) => {
        this.logger.debug(`${collectionName}.${method}( %j ) => %j`, query, doc);
      });
    }
  }
}
