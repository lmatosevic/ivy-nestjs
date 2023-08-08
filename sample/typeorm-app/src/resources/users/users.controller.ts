import { Controller } from '@nestjs/common';
import { Override, ResourceController } from 'ivy-nestjs/resource';
import { User } from './entity';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UsersService } from './users.service';
import { UsersPolicy } from './policy';

@Controller('users')
export class UsersController extends ResourceController(User, CreateUserDto, UpdateUserDto) {
  constructor(private usersService: UsersService, private usersPolicy: UsersPolicy) {
    super(usersService, usersPolicy);
  }

  @Override()
  async find(id: string | number): Promise<User> {
    const user = await super.find(id);
    console.log('Inside find override');
    return user;
  }
}
