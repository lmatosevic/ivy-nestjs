import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { ContextIdFactory, ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import {
  DiskHealthIndicator,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  MemoryHealthIndicator,
  MongooseHealthIndicator,
  TypeOrmHealthIndicator
} from '@nestjs/terminus';
import { HealthModuleOptions } from './health.module';
import { HEALTH_MODULE_OPTIONS } from './health.constants';
import { MailService } from '../mail';

@Injectable()
export class HealthService implements OnModuleInit {
  public readonly memoryThreshold: number;
  public readonly diskThreshold: number;
  public readonly diskPath: string;

  private dbIndicator: any;

  constructor(
    @Inject(HEALTH_MODULE_OPTIONS) private healthModuleOptions: HealthModuleOptions,
    private configService: ConfigService,
    private moduleRef: ModuleRef,
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    @Optional() private mailService: MailService
  ) {
    this.memoryThreshold =
      healthModuleOptions.memoryThreshold ?? configService.get('health.memoryThreshold') ?? 512;
    this.diskThreshold =
      healthModuleOptions.diskThreshold ?? configService.get('health.diskThreshold') ?? 0.9;
    this.diskPath = healthModuleOptions.diskPath || configService.get('health.rootDir') || '/';
  }

  async onModuleInit(): Promise<void> {
    const contextId = ContextIdFactory.create();
    if (this.configService.get('db.type') === 'mongoose') {
      this.dbIndicator = await this.moduleRef.resolve(MongooseHealthIndicator, contextId, { strict: false });
    } else {
      this.dbIndicator = await this.moduleRef.resolve(TypeOrmHealthIndicator, contextId, { strict: false });
    }
  }

  public async allCheck(): Promise<HealthCheckResult> {
    const optionalChecks = [];

    if (this.mailService) {
      optionalChecks.push(() => this.mailConnectionCheck());
    }

    return this.health.check([
      () => this.databaseCheck(),
      () => this.memoryCheck(),
      () => this.storageCheck(),
      ...optionalChecks
    ]);
  }

  public async databaseCheck(): Promise<HealthIndicatorResult> {
    return this.dbIndicator.pingCheck('database');
  }

  public async memoryCheck(): Promise<HealthIndicatorResult> {
    return this.memory.checkHeap('memory', this.memoryThreshold * 1024 * 1024);
  }

  public async storageCheck(): Promise<HealthIndicatorResult> {
    return this.disk.checkStorage('storage', {
      thresholdPercent: this.diskThreshold,
      path: path.resolve(this.diskPath)
    });
  }

  public async mailConnectionCheck(): Promise<HealthIndicatorResult> {
    let status;
    if (this.mailService) {
      status = await this.mailService?.checkConnection();
    } else {
      status = {
        status: 'down',
        error: 'Mail service is not defined'
      };
    }
    return { mail: status };
  }
}
