import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck } from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthDto } from './health.dto';
import { HealthModuleOptions } from './health.module';
import { HEALTH_MODULE_OPTIONS } from './health.constants';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(HEALTH_MODULE_OPTIONS) private healthModuleOptions: HealthModuleOptions,
    private healthService: HealthService
  ) {
    if (healthModuleOptions.route) {
      Reflect.defineMetadata('path', healthModuleOptions.route, HealthController);
    }
  }

  @HealthCheck()
  @Get()
  async health(): Promise<HealthDto> {
    return (await this.healthService.allCheck()) as any;
  }
}
