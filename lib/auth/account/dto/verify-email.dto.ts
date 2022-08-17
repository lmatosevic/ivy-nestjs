import { InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class VerifyEmailDto {
  @Expose()
  @IsNotEmpty()
  token: string;
}
