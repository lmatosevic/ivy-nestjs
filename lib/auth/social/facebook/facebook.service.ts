import { Inject, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { AuthSource } from '../../../enums';
import { CryptoUtil } from '../../../utils';
import { AuthModuleOptions, AuthorizationError } from '../../../auth';
import { AuthService } from '../../auth.service';
import { FacebookAuth } from './facebook-auth.dto';
import { JwtToken } from '../../strategy/jwt/jwt.dto';
import { AUTH_MODULE_OPTIONS } from '../../auth.constants';

@Injectable()
export class FacebookService {
  private readonly checkTokenUri = 'https://graph.facebook.com/debug_token';
  private readonly profileUri = 'https://graph.facebook.com/me';
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly accessToken: string;

  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
    private authService: AuthService,
    private httpService: HttpService
  ) {
    this.appId = authModuleOptions.facebook?.appId;
    this.appSecret = authModuleOptions.facebook?.appSecret;
    if (this.appId && this.appSecret) {
      this.accessToken = `${this.appId}|${this.appSecret}`;
    }
  }

  async authorize(data: FacebookAuth): Promise<JwtToken> {
    if (!this.accessToken) {
      throw new AuthorizationError('Facebook authentication is not supported');
    }

    const checkResponse = await this.getRequest(this.checkTokenUri, { input_token: data.accessToken, access_token: this.accessToken });

    if (checkResponse.data.data.app_id != this.appId) {
      throw new AuthorizationError('Invalid app ID');
    }

    if (checkResponse.data.data.user_id != data.userID) {
      throw new AuthorizationError('Invalid user ID');
    }

    const request = this.parseSignedRequest(data.signedRequest, this.appSecret);

    if (!request) {
      throw new AuthorizationError('Invalid token signature');
    }

    let profile;
    try {
      profile = await this.getRequest(this.profileUri, { fields: 'id,name,first_name,last_name,email', access_token: data.accessToken });
    } catch (e) {
      throw new AuthorizationError('Error while fetching Facebook profile data', 500, e);
    }

    let user = await this.authService.findUser(profile.data.email);

    if (!user) {
      user = await this.authService.register(
        {
          email: profile.data.email,
          firstName: profile.data.first_name,
          lastName: profile.data.last_name,
          verified: true,
          consent: true
        },
        AuthSource.Facebook
      );
    } else if (user.authSource !== AuthSource.Facebook) {
      throw new AuthorizationError('User account is not connected with Facebook', 403);
    }

    return await this.authService.login(user);
  }

  async getRequest(uri: string, params: any = {}): Promise<AxiosResponse> {
    return await firstValueFrom(
      this.httpService.get(uri, { params })
    );
  }

  private base64UrlDecode(data: string, encoding: BufferEncoding = 'utf-8'): string {
    data = data.replace('-', '+').replace('_', '/');
    let paddingfactor = (4 - (data.length % 4)) % 4;
    for (let i = 0; i < paddingfactor; i++) {
      data += '=';
    }
    return Buffer.from(data, 'base64').toString(encoding);
  }

  private parseSignedRequest(signedRequest: string, secret: string): any | null {
    let parts = signedRequest.split('.', 2);
    let encodedSignature = parts[0];
    let payload = parts[1];

    let signature = this.base64UrlDecode(encodedSignature, 'hex');
    let data = this.base64UrlDecode(payload);
    let jsonData = JSON.parse(data);

    let expectedSignature = CryptoUtil.signText(payload, secret);
    if (jsonData['algorithm'].toUpperCase() === 'HMAC-SHA256' && expectedSignature === signature) {
      return jsonData;
    }
    return null;
  }
}
