import { Injectable, Optional } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { RedisService } from '../../redis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Optional() private redisService: RedisService) {
    super();
  }

  public isConfigured(): boolean {
    return !!this.redisService;
  }

  async checkConnection(key: string): Promise<HealthIndicatorResult> {
    if (!this.redisService) {
      const message = 'Redis service is not defined';
      throw new HealthCheckError(message, this.getStatus(key, false, { message }));
    }

    const result = await this.redisService.checkConnection();
    const status = this.getStatus(key, result.status, { message: result.message });

    if (!result.status) {
      throw new HealthCheckError(result.message, status);
    }

    return status;
  }
}
