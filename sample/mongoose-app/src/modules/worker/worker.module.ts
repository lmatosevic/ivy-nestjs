import { Module } from '@nestjs/common';
import { WorkerController } from './worker.controller';
import { QueueModule } from 'ivy-nestjs';
import { WorkerJob } from './worker.job';

@Module({
  imports: [QueueModule.registerQueue({ name: 'worker' })],
  providers: [WorkerJob],
  controllers: [WorkerController]
})
export class WorkerModule {}
