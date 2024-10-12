import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
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
import { MailHealthIndicator, RedisHealthIndicator } from './indicators';
import { HealthModuleOptions } from './health.module';
import { HEALTH_MODULE_OPTIONS } from './health.constants';

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
    private mail: MailHealthIndicator,
    private redis: RedisHealthIndicator
  ) {
    this.memoryThreshold = healthModuleOptions.memoryThreshold ?? configService.get('health.memoryThreshold') ?? 1024;
    this.diskThreshold = healthModuleOptions.diskThreshold ?? configService.get('health.diskThreshold') ?? 0.9;
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

    if (this.mail.isConfigured()) {
      optionalChecks.push(() => this.mailCheck());
    }

    if (this.redis.isConfigured()) {
      optionalChecks.push(() => this.redisCheck());
    }

    try {
      return await this.health.check([
        () => this.databaseCheck(),
        () => this.memoryCheck(),
        () => this.storageCheck(),
        ...optionalChecks
      ]);
    } catch (err) {
      return err.response;
    }
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

  public async mailCheck(): Promise<HealthIndicatorResult> {
    return this.mail.checkConnection('mail');
  }

  public async redisCheck(): Promise<HealthIndicatorResult> {
    return this.redis.checkConnection('redis');
  }
}
