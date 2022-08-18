import { Injectable, Optional } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { MailService } from '../../mail';

@Injectable()
export class MailHealthIndicator extends HealthIndicator {
  constructor(@Optional() private mailService: MailService) {
    super();
  }

  public isConfigured(): boolean {
    return !!this.mailService;
  }

  async checkConnection(key: string): Promise<HealthIndicatorResult> {
    if (!this.mailService) {
      const message = 'Mail service is not defined';
      throw new HealthCheckError(message, this.getStatus(key, false, { message }));
    }

    const result = await this.mailService.checkConnection();
    const status = this.getStatus(key, result.status, { message: result.message });

    if (!result.status) {
      throw new HealthCheckError(result.message, status);
    }

    return status;
  }
}
