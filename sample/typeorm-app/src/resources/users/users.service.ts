import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileManager } from 'ivy-nestjs/storage';
import { TypeOrmUserDetailsService } from 'ivy-nestjs/auth';
import { User } from './entity';
import { CreateUserDto, UpdateUserDto } from '@resources/users/dto';

@Injectable()
export class UsersService extends TypeOrmUserDetailsService<User, CreateUserDto, UpdateUserDto> {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    protected fileManager: FileManager
  ) {
    super(usersRepository, fileManager);
  }
}
