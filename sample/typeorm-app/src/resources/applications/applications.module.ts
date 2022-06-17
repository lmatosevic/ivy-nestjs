import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsController } from './applications.controller';
import { ApplicationsResolver } from './applications.resolver';
import { ApplicationsService } from './applications.service';
import { Application } from './entity';
import { ApplicationsPolicy } from './policy';

@Module({
  imports: [TypeOrmModule.forFeature([Application])],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, ApplicationsResolver, ApplicationsPolicy],
  exports: [ApplicationsService, ApplicationsPolicy]
})
export class ApplicationsModule {}
