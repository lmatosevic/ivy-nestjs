export class SendMailDto {
  to: string;
  subject: string;
  content: MailContentDto;
  attachments?: MailAttachmentDto[];
}

export class MailContentDto {
  text?: string;
  html?: string;
  template?: MailTemplateDto;
}

export class MailTemplateDto {
  name?: string;
  content?: string;
  context?: any;
}

export class MailAttachmentDto {
  filename: string;
  path?: string;
  content?: string;
}
