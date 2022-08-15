import { Module } from '@nestjs/common';
import { MailerController } from './mailer.controller';

@Module({
  controllers: [MailerController]
})
export class MailerModule {}
