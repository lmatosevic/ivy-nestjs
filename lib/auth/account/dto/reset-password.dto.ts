import { ArgsType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsNotEmpty, MinLength } from 'class-validator';

@ArgsType()
export class ResetPasswordDto {
  @Expose()
  @IsNotEmpty()
  token: string;

  @Expose()
  @MinLength(6)
  @IsNotEmpty()
  password: string;
}
