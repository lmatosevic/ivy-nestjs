import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class MongooseSyncService implements OnModuleInit {
  constructor(@InjectConnection() private connection: Connection, private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const syncIndexes = this.configService.get<boolean>('db.syncIndexes');
    if (syncIndexes) {
      const models = Object.values(this.connection?.models || {});
      for (const model of models) {
        await model.syncIndexes();
      }
    }
  }
}
