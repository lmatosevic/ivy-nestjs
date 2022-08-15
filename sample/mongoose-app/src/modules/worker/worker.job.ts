import { Logger } from '@nestjs/common';
import { OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

export type WorkerData = {
  startedAt: Date;
};

@Processor('worker')
export class WorkerJob {
  private readonly logger: Logger = new Logger(WorkerJob.name);

  @Process()
  async process(job: Job<WorkerData>): Promise<boolean> {
    this.logger.verbose('Processing worker data: %j', job.data);
    return true;
  }

  @OnQueueCompleted()
  async onCompleted(job: Job, result: boolean): Promise<void> {
    this.logger.verbose('Worker job finished: %j', result);
  }

  @OnQueueFailed()
  async onFailed(job: Job, err: Error): Promise<void> {
    this.logger.error('Job ID: %d failed: %j', job.id, err.message);
  }
}
