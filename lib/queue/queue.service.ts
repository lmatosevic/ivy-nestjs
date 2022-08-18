import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { QUEUE_MODULE_OPTIONS } from './queue.constant';
import { QueueModuleOptions } from './queue.module';

@Injectable()
export class QueueService {
  constructor(
    @Inject(QUEUE_MODULE_OPTIONS) private queueModuleOptions: QueueModuleOptions,
    private configService: ConfigService
  ) {}

  public async checkConnection(): Promise<{ status: boolean; message?: string }> {
    const host = this.queueModuleOptions.redis?.host ?? this.configService.get('queue.host');
    const port = this.queueModuleOptions.redis?.port ?? this.configService.get('queue.port');
    const username = this.queueModuleOptions.redis?.username ?? this.configService.get('queue.user');
    const password = this.queueModuleOptions.redis?.password ?? this.configService.get('queue.password');
    const db = this.queueModuleOptions.redis?.db ?? this.configService.get('queue.db');

    return new Promise((resolve) => {
      const connection = new Redis({
        port,
        host,
        username,
        password,
        db,
        enableReadyCheck: true,
        connectTimeout: 3000,
        retryStrategy() {
          return null;
        }
      });

      connection.once('ready', () => {
        resolve({ status: true });
        connection.disconnect();
      });

      connection.once('error', (e) => {
        resolve({ status: false, message: e.message });
      });
    });
  }
}
