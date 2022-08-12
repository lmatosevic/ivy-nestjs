import { InputType } from '@nestjs/graphql';
import { PartialType } from 'ivy-nestjs/resource';
import { IsInt, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

@InputType()
export class UpdateUserDto extends PartialType(CreateUserDto, {
  omit: ['consent']
}) {
  @Expose()
  @IsInt()
  @IsOptional()
  readonly id?: number;
}
