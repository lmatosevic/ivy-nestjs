import { Resolver } from '@nestjs/graphql';
import { ResourceResolver } from 'ivy-nestjs/resource';
import { Application } from './schema';
import { CreateApplicationDto, UpdateApplicationDto } from './dto';
import { ApplicationsService } from './applications.service';
import { ApplicationsPolicy } from './policy';

@Resolver(() => Application)
export class ApplicationsResolver extends ResourceResolver(Application, CreateApplicationDto, UpdateApplicationDto) {
  constructor(private applicationsService: ApplicationsService, private applicationsPolicy: ApplicationsPolicy) {
    super(applicationsService, applicationsPolicy);
  }
}
