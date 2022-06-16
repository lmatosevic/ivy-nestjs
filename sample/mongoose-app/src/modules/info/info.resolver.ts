import { ConfigService } from '@nestjs/config';
import { Query, Resolver } from '@nestjs/graphql';
import { InfoDto } from './info.dto';

@Resolver()
export class InfoResolver {
  constructor(private readonly configService: ConfigService) {}

  @Query(() => InfoDto)
  info(): InfoDto {
    return {
      name: this.configService.get('app.name'),
      description: this.configService.get('app.description'),
      version: this.configService.get('app.version'),
      environment: this.configService.get('env')
    };
  }
}
