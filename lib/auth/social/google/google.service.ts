import { OAuth2Client } from 'google-auth-library';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModuleOptions, AuthorizationError } from '../../../auth';
import { AuthService } from '../../auth.service';
import { AuthSource } from '../../../enums';
import { GoogleAuth } from './google-auth.dto';
import { JwtToken } from '../../strategy/jwt/jwt.dto';
import { AUTH_MODULE_OPTIONS } from '../../auth.constants';
import { AccountService } from '../../account';

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);
  private readonly clientId: string;
  private readonly client: OAuth2Client;

  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
    private configService: ConfigService,
    private authService: AuthService,
    private accountService: AccountService
  ) {
    this.clientId = authModuleOptions.google?.clientId || configService.get('auth.google.clientId');
    this.client = new OAuth2Client(this.clientId);

    const enabled =
      authModuleOptions.google?.enabled === undefined
        ? configService.get('auth.google.enabled')
        : authModuleOptions.google?.enabled;

    if (enabled && !this.clientId) {
      this.logger.warn('Google client ID is not configured');
    }
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
      user = await this.accountService.register(
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
