import { ArgsType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

@ArgsType()
export class SendResetPasswordDto {
  @Expose()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
