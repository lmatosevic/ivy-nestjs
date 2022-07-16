import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsController } from './projects.controller';
import { ProjectsResolver } from './projects.resolver';
import { Project, ProjectSchema } from './schema';
import { ProjectsService } from './projects.service';
import { ProjectsPolicy } from './policy';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }])
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsResolver, ProjectsPolicy],
  exports: [ProjectsService, ProjectsPolicy]
})
export class ProjectsModule {}
