import { Body, Controller, Post } from '@nestjs/common';
import { Authorized, Role, Roles, StatusResponse } from 'ivy-nestjs';
import { MailService } from 'ivy-nestjs/mail';
import { SendMailDto } from './send-mail.dto';

@Controller('mail')
export class MailerController {
  constructor(private mailService: MailService) {}

  @Authorized()
  @Roles(Role.Admin)
  @Post('send')
  async send(@Body() sendMailDto: SendMailDto): Promise<StatusResponse> {
    const result = await this.mailService.send(
      sendMailDto.to,
      sendMailDto.subject,
      sendMailDto.text,
      sendMailDto.html,
      sendMailDto.attachments,
    );
    return {
      success: result,
      message: result ? 'Email sent' : 'Sending email failed'
    };
  }
}
