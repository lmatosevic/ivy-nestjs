import { DataSource } from 'typeorm';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MigrationService implements OnModuleInit {
  constructor(private configService: ConfigService, private dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    if (
      this.configService.get<boolean>('db.migration.autoRun') &&
      !this.configService.get<boolean>('docsOnly')
    ) {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }
      await this.dataSource.runMigrations();
    }
  }
}
