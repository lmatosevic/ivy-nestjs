import { Controller } from '@nestjs/common';
import { ResourceController } from 'ivy-nestjs/resource';
import { Application } from './entity';
import { CreateApplicationDto, UpdateApplicationDto } from './dto';
import { ApplicationsService } from './applications.service';
import { ApplicationsPolicy } from './policy';

@Controller('applications')
export class ApplicationsController extends ResourceController(Application, CreateApplicationDto, UpdateApplicationDto) {
  constructor(private applicationsService: ApplicationsService, private applicationsPolicy: ApplicationsPolicy) {
    super(applicationsService, applicationsPolicy);
  }
}
