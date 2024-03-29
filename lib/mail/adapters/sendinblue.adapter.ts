import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sib from 'sib-api-v3-sdk';
import { MailAdapter } from './mail.adapter';
import { MailModuleOptions } from '../mail.module';
import { MailAttachment } from '../mail.service';
import { MAIL_MODULE_OPTIONS } from '../mail.constants';

@Injectable()
export class SendinblueAdapter implements MailAdapter {
  private readonly transactionalEmailsApi: any;
  private readonly accountApi: any;
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
    this.accountApi = new Sib.AccountApi();

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
    const result = await this.transactionalEmailsApi.sendTransacEmail({
      sender: {
        name: this.senderName,
        email: this.senderAddress
      },
      to: [{ email: to }],
      subject: subject,
      textContent: text,
      htmlContent: html,
      attachment: attachments?.map((a) => ({
        name: a.filename,
        content: a.content ? Buffer.from(a.content).toString('base64') : undefined,
        url: !a.content ? a.path : undefined
      }))
    });
    return !!result;
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.accountApi.getAccount();
      return true;
    } catch (e) {
      return false;
    }
  }
}
