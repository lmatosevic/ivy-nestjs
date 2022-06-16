import { InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  ValidateNested
} from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { AuthSource, Role } from 'ivy-nestjs/enums';
import { FileDto } from 'ivy-nestjs/storage';

@InputType()
export class CreateUserDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly firstName: string;

  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly lastName: string;

  @Expose()
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  readonly email: string;

  @Expose()
  @IsOptional()
  @IsEnum(Role)
  readonly role?: Role;

  @Expose()
  @IsOptional()
  @IsEnum(AuthSource)
  readonly authType?: AuthSource;

  @Expose()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @Expose()
  @IsOptional()
  @IsBoolean()
  readonly consent?: boolean;

  @Expose()
  @IsOptional()
  @IsBoolean()
  readonly verified?: boolean;

  @Expose()
  @IsOptional()
  @IsBoolean()
  readonly enabled?: boolean;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => FileDto)
  readonly avatar?: FileDto;
}
