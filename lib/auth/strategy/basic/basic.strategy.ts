import { BasicStrategy as PassportBasicStrategy } from 'passport-http';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthUser } from '../../interfaces/auth-user';
import { AuthorizationError } from '../../errors/authorization.error';
import { AuthSource } from '../../../enums/auth-source.enum';
import { AuthService } from '../../auth.service';

@Injectable()
export class BasicStrategy extends PassportStrategy(PassportBasicStrategy) {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(username: string, password: string): Promise<AuthUser> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new AuthorizationError('Invalid credentials');
    }
    if (user.authSource !== AuthSource.Local) {
      throw new AuthorizationError('User account is not from local source', 403);
    }
    return user;
  }
}
