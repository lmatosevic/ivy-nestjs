import { Module } from '@nestjs/common';
import {
  AuthModule,
  ConfigModule,
  FiltersModule,
  GraphQLModule,
  HealthModule,
  LoggerModule,
  MailModule,
  MongooseModule,
  QueueModule,
  RequestContextModule,
  StorageModule
} from 'ivy-nestjs';
import { AppService } from './app.service';
import { InfoModule } from '@modules/info';
import { WorkerModule } from '@modules/worker';
import { MailerModule } from '@modules/mailer';
import { UsersModule, UsersService } from '@resources/users';
import { RegisterUserDto } from '@resources/users/dto';
import { User } from '@resources/users/schema';
import { ProjectsModule } from '@resources/projects';
import { ApplicationsModule } from '@resources/applications';
import { PlansModule } from '@resources/plans';
import { FeaturesModule } from '@resources/features';
import { CategoriesModule } from '@resources/categories';

@Module({
  imports: [
    ConfigModule.forRoot(),
    StorageModule.forRoot(),
    LoggerModule.forRoot(),
    FiltersModule.forRoot(),
    HealthModule.forRoot(),
    MongooseModule.forRoot(),
    GraphQLModule.forRoot(),
    QueueModule.forRoot(),
    MailModule.forRoot(),
    AuthModule.forRootAsync({
      userDetailsClass: User,
      userRegisterDtoClass: RegisterUserDto,
      imports: [UsersModule],
      inject: [UsersService],
      useFactory: async (usersService: UsersService) => ({
        userDetailsService: usersService
      })
    }),
    RequestContextModule,
    InfoModule,
    WorkerModule,
    MailerModule,
    UsersModule,
    ProjectsModule,
    ApplicationsModule,
    PlansModule,
    FeaturesModule,
    CategoriesModule
  ],
  providers: [AppService]
})
export class AppModule {}
