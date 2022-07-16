import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsController } from './applications.controller';
import { ApplicationsResolver } from './applications.resolver';
import { Application, ApplicationSchema } from './schema';
import { ApplicationsService } from './applications.service';
import { ApplicationsPolicy } from './policy';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema }
    ])
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, ApplicationsResolver, ApplicationsPolicy],
  exports: [ApplicationsService, ApplicationsPolicy]
})
export class ApplicationsModule {}
