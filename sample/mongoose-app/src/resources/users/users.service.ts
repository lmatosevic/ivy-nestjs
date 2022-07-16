import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileManager } from 'ivy-nestjs/storage';
import { MongoUserDetailsService } from 'ivy-nestjs/auth';
import { CreateUserDto, UpdateUserDto } from './dto';
import { User } from './schema';

@Injectable()
export class UsersService extends MongoUserDetailsService<
  User,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(
    @InjectModel(User.name) protected userModel: Model<User>,
    protected fileManager: FileManager
  ) {
    super(userModel, fileManager);
  }
}
