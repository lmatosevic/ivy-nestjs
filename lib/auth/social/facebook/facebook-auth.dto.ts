import { InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { Expose } from 'class-transformer';

@InputType()
export class FacebookAuth {
  @Expose()
  @IsNotEmpty()
  accessToken: string;

  @Expose()
  @IsNotEmpty()
  userID: string;

  @Expose()
  @IsNotEmpty()
  signedRequest: string;
}
