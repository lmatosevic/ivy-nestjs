import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersResolver } from './users.resolver';
import { User, UserSchema } from './schema/user.schema';
import { UsersService } from './users.service';
import { UsersPolicy } from './policy';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersResolver, UsersPolicy],
  exports: [UsersService, UsersPolicy]
})
export class UsersModule {}
