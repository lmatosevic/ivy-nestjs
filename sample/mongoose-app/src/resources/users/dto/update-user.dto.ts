import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { IsOptional, IsString } from 'class-validator';
import { Expose } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

@InputType()
export class UpdateUserDto extends PartialType(CreateUserDto, {
  omit: ['consent']
}) {
  @Expose()
  @IsString()
  @IsOptional()
  readonly id?: string;
}
