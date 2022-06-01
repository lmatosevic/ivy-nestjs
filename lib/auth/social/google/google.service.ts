import { OAuth2Client } from 'google-auth-library';
import { Inject, Injectable } from '@nestjs/common';
import { AuthModuleOptions, AuthorizationError } from '../../../auth';
import { AuthService } from '../../auth.service';
import { AuthSource } from '../../../enums';
import { GoogleAuth } from './google-auth.dto';
import { JwtToken } from '../../strategy/jwt/jwt.dto';
import { AUTH_MODULE_OPTIONS } from '../../auth.constants';

@Injectable()
export class GoogleService {
  private readonly clientId: string;
  private readonly client: OAuth2Client;

  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
    private authService: AuthService
  ) {
    this.clientId = authModuleOptions.google?.clientId;
    this.client = new OAuth2Client(this.clientId);
  }

  async authorize(data: GoogleAuth): Promise<JwtToken> {
    if (!this.clientId) {
      throw new AuthorizationError('Google authentication is not supported');
    }

    let ticket;
    try {
      ticket = await this.client.verifyIdToken({
        idToken: data.idToken,
        audience: this.clientId
      });
    } catch (e) {
      throw new AuthorizationError('Token verification failed', 500);
    }
    const payload = ticket.getPayload();

    let user = await this.authService.findUser(payload.email);

    if (!user) {
      user = await this.authService.register(
        {
          email: payload.email,
          firstName: payload.given_name,
          lastName: payload.family_name,
          verified: true,
          consent: true
        },
        AuthSource.Google
      );
    } else if (user.authSource !== AuthSource.Google) {
      throw new AuthorizationError('User account is not connected with Google', 403);
    }

    return await this.authService.login(user);
  }
}
