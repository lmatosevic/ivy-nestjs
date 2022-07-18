import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Authorized, Role, Roles, StatusResponse } from 'ivy-nestjs';
import { WorkerData } from './worker.job';

@Controller('worker')
export class WorkerController {
  constructor(@InjectQueue('worker') private workerQueue: Queue<WorkerData>) {}

  @Authorized()
  @Roles(Role.Admin)
  @Get('start')
  async start(): Promise<StatusResponse> {
    await this.workerQueue.add({ startedAt: new Date() });
    return {
      success: true,
      message: 'Worker started'
    };
  }
}
