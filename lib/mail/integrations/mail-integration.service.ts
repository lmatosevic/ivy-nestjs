import { MailAttachment } from '../mail.service';

export interface MailIntegrationService {
  sendMail(
    to: string,
    subject: string,
    text: string,
    html?: string,
    attachments?: MailAttachment[]
  ): Promise<boolean>;

  checkConnection(): Promise<boolean>;
}
