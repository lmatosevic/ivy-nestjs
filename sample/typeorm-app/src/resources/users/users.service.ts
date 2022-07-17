import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileManager } from 'ivy-nestjs/storage';
import { TypeOrmUserDetailsService } from 'ivy-nestjs/auth';
import { User } from './entity';

@Injectable()
export class UsersService extends TypeOrmUserDetailsService<User> {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    protected fileManager: FileManager
  ) {
    super(usersRepository, fileManager);
  }
}
