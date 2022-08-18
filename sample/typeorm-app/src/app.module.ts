import { Module } from '@nestjs/common';
import {
  AuthModule,
  ConfigModule,
  FiltersModule,
  GraphQLModule,
  HealthModule,
  LoggerModule,
  MailModule,
  QueueModule,
  RequestContextModule,
  StorageModule,
  TypeOrmModule
} from 'ivy-nestjs';
import { AppService } from './app.service';
import { InfoModule } from '@modules/info';
import { WorkerModule } from '@modules/worker';
import { MailerModule } from '@modules/mailer';
import { UsersModule, UsersService } from '@resources/users';
import { User } from '@resources/users/entity';
import { RegisterUserDto } from '@resources/users/dto';
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
    TypeOrmModule.forRoot(),
    GraphQLModule.forRoot(),
    QueueModule.forRoot(),
    MailModule.forRoot({
      template: {
        options: {
          helpers: {
            hours: (expiresIn: number) => expiresIn / 60 / 60
          }
        }
      }
    }),
    AuthModule.forRootAsync({
      userDetailsClass: User,
      userRegisterDtoClass: RegisterUserDto,
      imports: [UsersModule],
      inject: [UsersService],
      useFactory: async (usersService: UsersService) => ({
        userDetailsService: usersService,
        accountOptions: {
          sendVerifyEmail: {
            content: {
              template: {
                name: 'verify-email'
              }
            }
          }
        }
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
