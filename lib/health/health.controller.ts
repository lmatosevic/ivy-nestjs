import { Controller, Get, HttpCode, HttpStatus, Inject, Response } from '@nestjs/common';
import { HealthCheck } from '@nestjs/terminus';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { ReadyCheckDto } from './dto';
import { HealthModuleOptions } from './health.module';
import { HEALTH_MODULE_OPTIONS } from './health.constants';
import { Response as ExpressResponse } from 'express';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(HEALTH_MODULE_OPTIONS) private healthModuleOptions: HealthModuleOptions,
    private configService: ConfigService,
    private healthService: HealthService
  ) {
    const route = healthModuleOptions.route ?? configService.get('health.route');
    if (route) {
      Reflect.defineMetadata('path', route, HealthController);
    }
  }

  @HealthCheck()
  @Get()
  async health(@Response({ passthrough: true }) res: ExpressResponse): Promise<void> {
    const healthCheck = await this.healthService.allCheck();
    res.status(healthCheck.status == 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(healthCheck);
  }

  @ApiOkResponse({ type: () => ReadyCheckDto })
  @HttpCode(200)
  @Get('/ready')
  async ready(): Promise<ReadyCheckDto> {
    return { ready: true };
  }
}
