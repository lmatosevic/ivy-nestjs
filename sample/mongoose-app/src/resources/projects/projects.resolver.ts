import { Resolver } from '@nestjs/graphql';
import { ResourceResolver } from 'ivy-nestjs/resource';
import { Project } from './schema/project.schema';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { ProjectsService } from './projects.service';
import { ProjectsPolicy } from './policy';

@Resolver(() => Project)
export class ProjectsResolver extends ResourceResolver(Project, CreateProjectDto, UpdateProjectDto) {
  constructor(private projectsService: ProjectsService, private projectsPolicy: ProjectsPolicy) {
    super(projectsService, projectsPolicy);
  }
}
