import { DynamicModule, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ModuleAsyncOptions, ModuleUtil } from '../utils';
import { HealthController } from './health.controller';
import { HealthResolver } from './health.resolver';
import { HealthService } from './health.service';
import { MailHealthIndicator, RedisHealthIndicator } from './indicators';
import { HEALTH_MODULE_OPTIONS } from './health.constants';

export interface HealthModuleOptions {
  route?: string;
  diskPath?: string;
  diskThreshold?: number;
  memoryThreshold?: number;
}

@Module({})
export class HealthModule {
  static forRoot(options: HealthModuleOptions = {}): DynamicModule {
    return this.createModule([
      {
        provide: HEALTH_MODULE_OPTIONS,
        useValue: options
      }
    ]);
  }

  static forRootAsync(options: ModuleAsyncOptions<HealthModuleOptions>): DynamicModule {
    const { providers, imports } = ModuleUtil.makeAsyncImportsAndProviders(options, HEALTH_MODULE_OPTIONS);
    return this.createModule(providers, imports);
  }

  static createModule(providers: any[] = [], imports: any[] = []): DynamicModule {
    return {
      module: HealthModule,
      imports: [...imports, TerminusModule],
      providers: [...providers, HealthResolver, HealthService, MailHealthIndicator, RedisHealthIndicator],
      controllers: [HealthController],
      exports: [HEALTH_MODULE_OPTIONS]
    };
  }
}
