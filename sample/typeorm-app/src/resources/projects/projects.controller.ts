import { Controller } from '@nestjs/common';
import { ResourceController } from 'ivy-nestjs/resource';
import { Project } from './entity';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { ProjectsService } from './projects.service';
import { ProjectsPolicy } from './policy';

@Controller('projects')
export class ProjectsController extends ResourceController(Project, CreateProjectDto, UpdateProjectDto) {
  constructor(
    private projectsService: ProjectsService,
    private projectsPolicy: ProjectsPolicy
  ) {
    super(projectsService, projectsPolicy);
  }
}
