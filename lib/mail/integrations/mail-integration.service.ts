export type Attachment = {
  filename: string;
  path?: string;
  content?: string;
};

export interface MailIntegrationService {
  sendMail(to: string, subject: string, text: string, html?: string, attachments?: Attachment[]): Promise<boolean>;
}
