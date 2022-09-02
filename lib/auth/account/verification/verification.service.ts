import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateApiKey } from 'generate-api-key';
import { ObjectUtil } from '../../../utils';
import { VerificationType } from '../../../enums';
import { VerificationTokenData, VerificationTokenService } from './services';
import { VerificationModuleOptions } from './verification.module';
import { VERIFICATION_MODULE_OPTIONS, VERIFICATION_TOKEN_SERVICE } from './verification.constants';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly tokenType;
  private readonly tokenLength;
  private readonly tokenPrefix;

  constructor(
    @Inject(VERIFICATION_MODULE_OPTIONS) private verificationModuleOptions: VerificationModuleOptions,
    @Inject(VERIFICATION_TOKEN_SERVICE)
    private verificationTokenService: VerificationTokenService<VerificationTokenData>,
    private configService: ConfigService
  ) {
    this.tokenType =
      verificationModuleOptions.tokenType ?? configService.get('account.verification.tokenType');
    this.tokenLength =
      verificationModuleOptions.tokenLength ?? configService.get('account.verification.tokenLength');
    this.tokenPrefix =
      verificationModuleOptions.tokenPrefix ?? configService.get('account.verification.tokenPrefix');
  }

  useWith(sessionManager: any): VerificationService {
    const managedService = ObjectUtil.duplicate<VerificationService>(this);

    managedService.setVerificationTokenService(this.verificationTokenService.useWith(sessionManager));

    return managedService;
  }

  async createToken(
    type: VerificationType,
    accountId: string | number,
    expiresAt: Date
  ): Promise<VerificationTokenData> {
    let tries = 0;
    let verificationToken;
    while (!verificationToken) {
      tries++;
      let token = this.generateToken();
      if (tries === 10) {
        token = token + this.generateToken();
      }
      try {
        verificationToken = await this.verificationTokenService.create(token, type, accountId, expiresAt);
      } catch (e) {
        this.logger.warn('Creating verification token failed: %j', e);
        this.logger.warn('Possible duplicate token value generated, retrying...');
      }
      if (tries >= 10) {
        throw Error(`Unable to create verification token in database after ${tries} retries`);
      }
    }

    return verificationToken;
  }

  async findToken(token: string, type?: VerificationType): Promise<VerificationTokenData> {
    let verificationToken = await this.verificationTokenService.find(token, type);
    if (!verificationToken) {
      this.logger.debug('Unable to find verification (%s) token: %s', type, token);
    }
    return verificationToken;
  }

  async findAndValidateToken(
    token: string,
    type?: VerificationType
  ): Promise<{ verificationToken?: VerificationTokenData; error?: string }> {
    let verificationToken = await this.findToken(token, type);

    if (!verificationToken) {
      return { error: 'Token does not exist' };
    }

    if (verificationToken.usedAt) {
      return { error: 'Token is already used' };
    }

    const now = new Date();
    if (verificationToken.expiresAt && verificationToken.expiresAt.getTime() < now.getTime()) {
      return { error: 'Token has expired' };
    }

    await this.verificationTokenService.update(verificationToken.id, { usedAt: new Date() });

    return { verificationToken };
  }

  async deleteToken(id: string | number): Promise<boolean> {
    return await this.verificationTokenService.delete(id);
  }

  generateToken(): string {
    return generateApiKey({
      method: this.tokenType,
      length: this.tokenLength,
      prefix: this.tokenPrefix
    }) as string;
  }

  private setVerificationTokenService(service: VerificationTokenService<VerificationTokenData>): void {
    this.verificationTokenService = service;
  }
}
