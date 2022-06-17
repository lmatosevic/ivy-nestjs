import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsResolver } from './projects.resolver';
import { ProjectsService } from './projects.service';
import { Project } from './entity';
import { ProjectsPolicy } from './policy';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsResolver, ProjectsPolicy],
  exports: [ProjectsService, ProjectsPolicy]
})
export class ProjectsModule {}
