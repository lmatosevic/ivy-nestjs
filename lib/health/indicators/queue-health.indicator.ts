import { Injectable, Optional } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { QueueService } from '../../queue';

@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  constructor(@Optional() private queueService: QueueService) {
    super();
  }

  public isConfigured(): boolean {
    return !!this.queueService;
  }

  async checkConnection(key: string): Promise<HealthIndicatorResult> {
    if (!this.queueService) {
      const message = 'Queue service is not defined';
      throw new HealthCheckError(message, this.getStatus(key, false, { message }));
    }

    const result = await this.queueService.checkConnection();
    const status = this.getStatus(key, result.status, { message: result.message });

    if (!result.status) {
      throw new HealthCheckError(result.message, status);
    }

    return status;
  }
}
