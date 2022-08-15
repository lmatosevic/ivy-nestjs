import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Attachment, MailIntegrationService } from './integrations';
import { MailModuleOptions } from './mail.module';
import { SendMailData } from './mail.job';
import { MAIL_INTEGRATION_SERVICE, MAIL_MODULE_OPTIONS, MAIL_QUEUE_NAME } from './mail.constants';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly queueEnabled: boolean;

  constructor(
    @Inject(MAIL_INTEGRATION_SERVICE) private mailIntegrationService: MailIntegrationService,
    @Inject(MAIL_MODULE_OPTIONS) private mailModuleOptions: MailModuleOptions,
    @InjectQueue(MAIL_QUEUE_NAME) private mailQueue: Queue<SendMailData>,
    private configService: ConfigService
  ) {
    if (!this.mailIntegrationService) {
      throw Error('Mail integration service implementation is not provided');
    }
    this.queueEnabled = mailModuleOptions.queueEnabled ?? configService.get('mail.queueEnabled');
  }

  async send(
    to: string,
    subject: string,
    text: string,
    html?: string,
    attachments?: Attachment[]
  ): Promise<boolean> {
    if (this.queueEnabled) {
      return !!(await this.sendToQueue(to, subject, text, html, attachments));
    } else {
      return this.sendDirect(to, subject, text, html, attachments);
    }
  }

  async sendToQueue(
    to: string,
    subject: string,
    text: string,
    html?: string,
    attachments?: Attachment[]
  ): Promise<Job<SendMailData>> {
    if (!this.queueEnabled) {
      throw Error('Mail queue is disabled');
    }
    const job = await this.mailQueue.add({ to, subject, text, html, attachments });
    this.logger.verbose('Email added to queue with job ID: %s', job.id);
    return job;
  }

  async sendDirect(
    to: string,
    subject: string,
    text: string,
    html?: string,
    attachments?: Attachment[]
  ): Promise<boolean> {
    const result = await this.mailIntegrationService.sendMail(to, subject, text, html, attachments);
    this.logger.verbose('Email sent');
    return result;
  }
}
