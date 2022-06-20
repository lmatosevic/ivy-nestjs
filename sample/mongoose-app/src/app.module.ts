import { Module } from '@nestjs/common';
import {
  ConfigModule,
  AuthModule,
  LoggerModule,
  StorageModule,
  GraphQLModule,
  MongooseModule,
  FiltersModule,
  HealthModule,
  RequestContextModule
} from 'ivy-nestjs';
import { AppService } from './app.service';
import { InfoModule } from '@modules/info';
import { UsersModule, UsersService } from '@resources/users';
import { RegisterUserDto } from '@resources/users/dto';
import { User } from '@resources/users/schema';
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
    MongooseModule.forRoot(),
    GraphQLModule.forRoot(),
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
    UsersModule,
    ProjectsModule,
    ApplicationsModule,
    PlansModule,
    FeaturesModule
  ],
  providers: [AppService]
})
export class AppModule {}
