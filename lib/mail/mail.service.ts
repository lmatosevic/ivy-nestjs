import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { MailIntegrationService } from './integrations';
import { MailModuleOptions } from './mail.module';
import { SendMailData } from './mail.job';
import {
  MAIL_INTEGRATION_SERVICE,
  MAIL_MODULE_OPTIONS,
  MAIL_QUEUE_NAME,
  MAIL_TEMPLATE_ADAPTER
} from './mail.constants';
import { TemplateAdapter } from './template-adapters';
import { TemplateUtil } from '../utils';
import * as _ from 'lodash';

export type MailContent = {
  text?: string;
  html?: string;
  template?: {
    name?: string;
    content?: string;
    context?: Record<string, any>;
  };
};

export type MailAttachment = {
  filename: string;
  path?: string;
  content?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly queueEnabled: boolean;
  private readonly templateEnabled: boolean;

  constructor(
    @Inject(MAIL_INTEGRATION_SERVICE) private mailIntegrationService: MailIntegrationService,
    @Inject(MAIL_MODULE_OPTIONS) private mailModuleOptions: MailModuleOptions,
    @InjectQueue(MAIL_QUEUE_NAME) private mailQueue: Queue<SendMailData>,
    @Optional() @Inject(MAIL_TEMPLATE_ADAPTER) private templateAdapter: TemplateAdapter,
    private configService: ConfigService
  ) {
    if (!this.mailIntegrationService) {
      throw Error('Mail integration service implementation is not provided');
    }
    this.queueEnabled = mailModuleOptions.queueEnabled ?? configService.get('mail.queueEnabled');
    this.templateEnabled = mailModuleOptions.template?.enabled ?? configService.get('mail.template.enabled');
  }

  async send(
    to: string,
    subject: string,
    content: MailContent,
    attachments?: MailAttachment[]
  ): Promise<boolean> {
    if (this.queueEnabled) {
      return !!(await this.sendToQueue(to, subject, content, attachments));
    } else {
      return this.sendDirect(to, subject, content, attachments);
    }
  }

  async sendToQueue(
    to: string,
    subject: string,
    content: MailContent,
    attachments?: MailAttachment[]
  ): Promise<Job<SendMailData>> {
    if (!this.queueEnabled) {
      throw Error('Mail queue is disabled');
    }
    const job = await this.mailQueue.add({ to, subject, content, attachments });
    this.logger.verbose('Email added to queue with job ID: %s', job.id);
    return job;
  }

  async sendDirect(
    to: string,
    subject: string,
    content: MailContent,
    attachments?: MailAttachment[]
  ): Promise<boolean> {
    const { text, html } = await this.compileContent(content);
    const result = await this.mailIntegrationService.sendMail(to, subject, text, html, attachments);
    this.logger.verbose('Email sent');
    return result;
  }

  async compileContent(content: MailContent): Promise<{ text: string; html: string }> {
    if (
      !this.templateEnabled ||
      !this.templateAdapter ||
      !content.template ||
      (!content.template?.content && !content.template?.name)
    ) {
      if (!content.text && !content.html) {
        throw Error('Mail content is not provided by neither text, html nor template properties');
      }
      return {
        text: content.text ?? TemplateUtil.textFromHtml(content.html),
        html: content.html ?? TemplateUtil.htmlFromText(content.text)
      };
    }

    const isFile = !content.template?.content;

    const templateConfig = _.merge(
      { ...this.configService.get('mail.template') },
      this.mailModuleOptions.template
    );
    const html = await this.templateAdapter.compile(
      content.template?.name,
      content.template?.context || {},
      templateConfig,
      isFile
    );

    return { text: TemplateUtil.textFromHtml(html), html };
  }

  async checkConnection(): Promise<{ status: boolean; message?: string }> {
    const result = await this.mailIntegrationService.checkConnection();
    return { status: result, message: !result ? 'Mail server connection failed' : undefined };
  }
}
