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
  TypeOrmModule
} from 'ivy-nestjs';
import { AppService } from './app.service';
import { InfoModule } from '@modules/info';
import { UsersModule, UsersService } from '@resources/users';
import { User } from '@resources/users/entity';
import { RegisterUserDto } from '@resources/users/dto';
import { ProjectsModule } from '@resources/projects';
import { ApplicationsModule } from '@resources/applications';

@Module({
  imports: [
    ConfigModule.forRoot(),
    StorageModule.forRoot(),
    LoggerModule.forRoot(),
    FiltersModule.forRoot(),
    HealthModule.forRoot(),
    TypeOrmModule.forRoot(),
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
    ApplicationsModule
  ],
  providers: [AppService]
})
export class AppModule {}
