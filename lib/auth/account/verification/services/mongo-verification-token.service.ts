import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VerificationType } from '../../../../enums';
import { VerificationToken } from '../schema';
import { VerificationTokenData, VerificationTokenService } from './verification-token.service';

@Injectable()
export class MongoVerificationTokenService implements VerificationTokenService<VerificationToken> {
  private readonly logger: Logger = new Logger(MongoVerificationTokenService.name);

  constructor(
    @InjectModel(VerificationToken.name) protected verificationTokenModel: Model<VerificationToken>
  ) {}

  async find(token: string, type?: VerificationType): Promise<VerificationToken> {
    const filter = { token };
    if (type) {
      filter['type'] = type;
    }
    try {
      return await this.verificationTokenModel.findOne(filter).exec();
    } catch (e) {
      this.logger.error('Error finding verification token "%s", %j', token, e);
      return null;
    }
  }

  async create(
    token: string,
    type: VerificationType,
    accountId: string,
    expiresAt?: Date
  ): Promise<VerificationToken> {
    const model = new this.verificationTokenModel({ token, type, accountId, expiresAt });

    let savedModel;
    try {
      savedModel = await model.save();
    } catch (e) {
      this.logger.error('Error creating verification token "%s", %j', token, e);
      throw e;
    }
    return savedModel;
  }

  async update(id: string, tokenData: Partial<VerificationTokenData>): Promise<boolean> {
    try {
      const verificationToken = await this.verificationTokenModel.findOne({ _id: id }).exec();
      verificationToken.set(tokenData);
      await verificationToken.save();
      return true;
    } catch (e) {
      this.logger.error('Error updating verification token with id "%s", %j', id, e);
      throw e;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const verificationToken = await this.verificationTokenModel.findOne({ _id: id }).exec();
      await verificationToken.remove();
    } catch (e) {
      this.logger.error('Error deleting verification token with id "%s", %j', id, e);
      return false;
    }
    return true;
  }
}
