import { InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { Equals, IsBoolean } from 'class-validator';
import { PartialType } from 'ivy-nestjs/resource';
import { CreateUserDto } from './create-user.dto';

@InputType()
export class RegisterUserDto extends PartialType(CreateUserDto, {
  pick: ['firstName', 'lastName', 'email', 'password', 'avatar'],
  keepRequired: true
}) {
  @Expose()
  @IsBoolean()
  @Equals(true)
  readonly consent: boolean;
}
