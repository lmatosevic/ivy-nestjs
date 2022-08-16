import { Logger } from '@nestjs/common';
import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { MailAttachment, MailContent, MailService } from './mail.service';
import { MAIL_QUEUE_NAME } from './mail.constants';

export type SendMailData = {
  to: string;
  subject: string;
  content: MailContent;
  attachments?: MailAttachment[];
};

@Processor(MAIL_QUEUE_NAME)
export class MailJob {
  private readonly logger: Logger = new Logger(MailJob.name);

  constructor(private mailService: MailService) {}

  @Process()
  async process(job: Job<SendMailData>): Promise<boolean> {
    return this.mailService.sendDirect(job.data.to, job.data.subject, job.data.content, job.data.attachments);
  }

  @OnQueueFailed()
  async onFailed(job: Job, err: Error): Promise<void> {
    this.logger.error('Mail job ID: %d failed: %j', job.id, err.message);
  }
}
