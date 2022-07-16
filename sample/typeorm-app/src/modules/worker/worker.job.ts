import { Logger } from '@nestjs/common';
import { OnQueueCompleted, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

export type WorkerData = {
  startedAt: Date;
};

@Processor('worker')
export class WorkerJob {
  private readonly logger: Logger = new Logger(WorkerJob.name);

  @Process()
  async onMessage(job: Job<WorkerData>): Promise<boolean> {
    this.logger.log('Processing worker data: %j', job.data);
    return true;
  }

  @OnQueueCompleted()
  async onCompleted(job: Job, result: boolean): Promise<void> {
    this.logger.log('Worker job finished: %j', result);
  }
}
