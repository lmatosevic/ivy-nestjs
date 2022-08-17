import { ArgsType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

@ArgsType()
export class VerifyEmailDto {
  @Expose()
  @IsNotEmpty()
  token: string;
}
