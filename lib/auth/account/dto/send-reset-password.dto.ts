import { InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

@InputType()
export class SendResetPasswordDto {
  @Expose()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
