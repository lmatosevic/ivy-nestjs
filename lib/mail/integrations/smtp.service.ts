import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter, createTransport } from 'nodemailer';
import { Attachment, MailIntegrationService } from './mail-integration.service';
import { MailModuleOptions } from '../mail.module';
import { MAIL_MODULE_OPTIONS } from '../mail.constants';

@Injectable()
export class SmtpService implements MailIntegrationService {
  private readonly transporter: Transporter;
  private readonly senderName: string;
  private readonly senderAddress: string;

  constructor(
    @Inject(MAIL_MODULE_OPTIONS) private mailModuleOptions: MailModuleOptions,
    private configService: ConfigService
  ) {
    const options = mailModuleOptions.smtp || {};
    const config = configService.get('mail.smtp');

    this.transporter = createTransport({
      host: options.host ?? config.host,
      port: options.port ?? config.port,
      secure: options.secure ?? config.secure,
      auth: {
        user: options.user ?? config.user,
        pass: options.password ?? config.password
      }
    });

    this.senderName = mailModuleOptions.senderName ?? configService.get('mail.senderName');
    this.senderAddress = mailModuleOptions.senderAddress ?? configService.get('mail.senderAddress');
  }

  async sendMail(
    to: string,
    subject: string,
    text: string,
    html?: string,
    attachments?: Attachment[]
  ): Promise<boolean> {
    const result = await this.transporter.sendMail({
      from: `"${this.senderName}" <${this.senderAddress}>`,
      to: to,
      subject: subject,
      text: text,
      html: html ? html : `<p>${text}</p>`,
      attachments: attachments
    });
    return !!result;
  }
}
