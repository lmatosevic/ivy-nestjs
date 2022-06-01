import { Inject, Injectable } from '@nestjs/common';
import * as path from 'path';
import {
  DiskHealthIndicator,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  MemoryHealthIndicator,
  MongooseHealthIndicator
} from '@nestjs/terminus';
import { HealthModuleOptions } from './health.module';
import { HEALTH_MODULE_OPTIONS } from './health.constants';

@Injectable()
export class HealthService {
  public readonly memoryThreshold: number;
  public readonly diskThreshold: number;
  public readonly diskPath: string;

  constructor(
    @Inject(HEALTH_MODULE_OPTIONS) private healthModuleOptions: HealthModuleOptions,
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator
  ) {
    this.memoryThreshold = healthModuleOptions.memoryThreshold ?? 512;
    this.diskThreshold = healthModuleOptions.diskThreshold ?? 0.9;
    this.diskPath = healthModuleOptions.diskPath || '/';
  }

  public async allCheck(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.databaseCheck(),
      () => this.memoryCheck(),
      () => this.storageCheck()
    ]);
  }

  public async databaseCheck(): Promise<HealthIndicatorResult> {
    return this.db.pingCheck('database');
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
}
