import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersResolver } from './users.resolver';
import { User } from './entity';
import { UsersService } from './users.service';
import { UsersPolicy } from './policy';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UsersResolver, UsersPolicy],
  exports: [UsersService, UsersPolicy]
})
export class UsersModule {}
