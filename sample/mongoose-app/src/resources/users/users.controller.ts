import { Controller } from '@nestjs/common';
import { ResourceController } from 'ivy-nestjs/resource';
import { User } from './schema';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UsersService } from './users.service';
import { UsersPolicy } from './policy';

@Controller('users')
export class UsersController extends ResourceController(User, CreateUserDto, UpdateUserDto) {
  constructor(private usersService: UsersService, private usersPolicy: UsersPolicy) {
    super(usersService, usersPolicy);
  }
}
