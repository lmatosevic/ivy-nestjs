import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sib from 'sib-api-v3-sdk';
import { Attachment, MailIntegrationService } from './mail-integration.service';
import { MailModuleOptions } from '../mail.module';
import { MAIL_MODULE_OPTIONS } from '../mail.constants';

@Injectable()
export class SendinblueService implements MailIntegrationService {
  private readonly transactionalEmailsApi: any;
  private readonly senderName: string;
  private readonly senderAddress: string;

  constructor(
    @Inject(MAIL_MODULE_OPTIONS) private mailModuleOptions: MailModuleOptions,
    private configService: ConfigService
  ) {
    let client = Sib.ApiClient.instance;
    let apiKey = client.authentications['api-key'];
    apiKey.apiKey = mailModuleOptions.sendinblue?.apiKey ?? configService.get('mail.sendinblue.apiKey');
    this.transactionalEmailsApi = new Sib.TransactionalEmailsApi();

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
    const result = await this.transactionalEmailsApi.sendTransacEmail({
      sender: {
        name: this.senderName,
        email: this.senderAddress
      },
      to: [{ email: to }],
      subject: subject,
      textContent: text,
      htmlContent: html ? html : `<p>${text}</p>`,
      attachment: attachments?.map((a) => ({
        name: a.filename,
        content: a.content ? Buffer.from(a.content).toString('base64') : undefined,
        url: !a.content ? a.path : undefined
      }))
    });
    return !!result;
  }
}
