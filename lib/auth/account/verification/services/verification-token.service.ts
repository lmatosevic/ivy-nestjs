import { VerificationType } from '../../../../enums';

export type VerificationTokenData = {
  id: string | number;
  token: string;
  type: VerificationType;
  accountId: string | number;
  expiresAt?: Date;
  usedAt?: Date;
};

export interface VerificationTokenService<T> {
  find(token: string, type?: VerificationType): Promise<T>;

  create(token: string, type: VerificationType, accountId: string | number, expiresAt?: Date): Promise<T>;

  update(id: string | number, tokenData: Partial<VerificationTokenData>): Promise<boolean>;

  delete(id: string | number): Promise<boolean>;
}
