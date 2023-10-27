import { Resolver } from '@nestjs/graphql';
import { ResourceResolver } from 'ivy-nestjs/resource';
import { User } from './schema';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UsersService } from './users.service';
import { UsersPolicy } from './policy';

@Resolver(() => User)
export class UsersResolver extends ResourceResolver(User, CreateUserDto, UpdateUserDto) {
  constructor(
    private usersService: UsersService,
    private usersPolicy: UsersPolicy
  ) {
    super(usersService, usersPolicy);
  }
}
