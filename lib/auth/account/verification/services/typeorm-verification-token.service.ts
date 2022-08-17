import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationType } from '../../../../enums';
import { VerificationToken } from '../entity';
import { VerificationTokenData, VerificationTokenService } from './verification-token.service';

@Injectable()
export class TypeOrmVerificationTokenService implements VerificationTokenService<VerificationToken> {
  private readonly logger: Logger = new Logger(TypeOrmVerificationTokenService.name);

  constructor(
    @InjectRepository(VerificationToken) private verificationTokenRepository: Repository<VerificationToken>
  ) {}

  async find(token: string, type?: VerificationType): Promise<VerificationToken> {
    const filter = { token };
    if (type) {
      filter['type'] = type;
    }
    try {
      return await this.verificationTokenRepository.findOneBy(filter);
    } catch (e) {
      this.logger.error('Error finding verification token "%s", %j', token, e);
      return null;
    }
  }

  async create(
    token: string,
    type: VerificationType,
    accountId: number,
    expiresAt?: Date
  ): Promise<VerificationToken> {
    const model = this.verificationTokenRepository.create({ token, type, accountId, expiresAt });

    let savedModel;
    try {
      savedModel = await this.verificationTokenRepository.save(model);
    } catch (e) {
      this.logger.error('Error creating verification token "%s", %j', token, e);
      throw e;
    }
    return savedModel;
  }

  async update(id: number, tokenData: Partial<VerificationTokenData>): Promise<boolean> {
    try {
      let verificationToken = await this.verificationTokenRepository.findOneBy({ id });
      verificationToken = this.verificationTokenRepository.merge(
        verificationToken,
        tokenData as VerificationToken
      );
      await this.verificationTokenRepository.save(verificationToken);
      return true;
    } catch (e) {
      this.logger.error('Error updating verification token with id "%s", %j', id, e);
      throw e;
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const model = await this.verificationTokenRepository.findOneBy({ id });
      return !!(await this.verificationTokenRepository.remove(model));
    } catch (e) {
      this.logger.error('Error deleting verification token with id "%s", %j', id, e);
      return false;
    }
  }
}
