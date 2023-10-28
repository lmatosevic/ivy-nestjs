import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileManager } from 'ivy-nestjs/storage';
import { MongooseUserDetailsService } from 'ivy-nestjs/auth';
import { User } from './schema';

@Injectable()
export class UsersService extends MongooseUserDetailsService<User> {
  constructor(
    @InjectModel(User.name) protected userModel: Model<User>,
    protected fileManager: FileManager
  ) {
    super(userModel, fileManager);
  }
}
