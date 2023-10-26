import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { VerificationType } from '../../../../enums';
import { ObjectUtil } from '../../../../utils';
import { VerificationToken } from '../schema';
import { VerificationTokenData, VerificationTokenService } from './verification-token.service';

@Injectable()
export class MongoVerificationTokenService implements VerificationTokenService<VerificationToken> {
  private readonly logger: Logger = new Logger(MongoVerificationTokenService.name);
  protected session?: ClientSession;

  constructor(@InjectModel(VerificationToken.name) protected verificationTokenModel: Model<VerificationToken>) {}

  useWith(sessionManager: ClientSession): VerificationTokenService<VerificationToken> {
    const managedService = ObjectUtil.duplicate<MongoVerificationTokenService>(this);

    managedService.setVerificationTokenModel(this.verificationTokenModel);
    managedService.setSession(sessionManager);

    return managedService;
  }

  async find(token: string, type?: VerificationType): Promise<VerificationToken> {
    const filter = { token };
    if (type) {
      filter['type'] = type;
    }
    try {
      return await this.verificationTokenModel.findOne(filter).session(this.session).exec();
    } catch (e) {
      this.logger.error('Error finding verification token "%s", %j', token, e);
      return null;
    }
  }

  async create(token: string, type: VerificationType, accountId: string, expiresAt?: Date): Promise<VerificationToken> {
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
      const verificationToken = await this.verificationTokenModel.findOne({ _id: id }).session(this.session).exec();
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
      const verificationToken = await this.verificationTokenModel.findOne({ _id: id }).session(this.session).exec();
      await verificationToken.deleteOne();
    } catch (e) {
      this.logger.error('Error deleting verification token with id "%s", %j', id, e);
      return false;
    }
    return true;
  }

  private setVerificationTokenModel(model: Model<VerificationToken>): void {
    this.verificationTokenModel = model;
  }

  private setSession(session: ClientSession): void {
    this.session = session;
  }
}
