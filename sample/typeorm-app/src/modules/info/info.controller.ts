import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InfoDto } from './info.dto';

@Controller('')
export class InfoController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  info(): InfoDto {
    return {
      name: this.configService.get('app.name'),
      description: this.configService.get('app.description'),
      version: this.configService.get('app.version'),
      environment: this.configService.get('env')
    };
  }
}
