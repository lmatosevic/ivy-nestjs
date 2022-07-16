import { Module } from '@nestjs/common';
import {
  AuthModule,
  ConfigModule,
  FiltersModule,
  GraphQLModule,
  HealthModule,
  LoggerModule,
  RequestContextModule,
  StorageModule,
  TypeOrmModule,
  QueueModule
} from 'ivy-nestjs';
import { AppService } from './app.service';
import { InfoModule } from '@modules/info';
import { WorkerModule } from '@modules/worker';
import { UsersModule, UsersService } from '@resources/users';
import { User } from '@resources/users/entity';
import { RegisterUserDto } from '@resources/users/dto';
import { ProjectsModule } from '@resources/projects';
import { ApplicationsModule } from '@resources/applications';
import { PlansModule } from '@resources/plans';
import { FeaturesModule } from '@resources/features';

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
    UsersModule,
    ProjectsModule,
    ApplicationsModule,
    PlansModule,
    FeaturesModule
  ],
  providers: [AppService]
})
export class AppModule {}
