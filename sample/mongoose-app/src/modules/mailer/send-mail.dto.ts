export class SendMailDto {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachmentDto[];
}

export class MailAttachmentDto {
  filename: string;
  path?: string;
  content?: string;
}
