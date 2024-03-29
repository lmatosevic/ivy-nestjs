import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { MailAdapter } from './mail.adapter';
import { MailModuleOptions } from '../mail.module';
import { MailAttachment } from '../mail.service';
import { MAIL_MODULE_OPTIONS } from '../mail.constants';

@Injectable()
export class SmtpAdapter implements MailAdapter {
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
    attachments?: MailAttachment[]
  ): Promise<boolean> {
    const result = await this.transporter.sendMail({
      from: `"${this.senderName}" <${this.senderAddress}>`,
      to,
      subject,
      text,
      html,
      attachments
    });
    return !!result;
  }

  async checkConnection(): Promise<boolean> {
    try {
      return await this.transporter.verify();
    } catch (e) {
      return false;
    }
  }
}
