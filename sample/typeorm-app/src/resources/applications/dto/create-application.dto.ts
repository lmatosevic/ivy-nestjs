import { InputType } from '@nestjs/graphql';
import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  ValidateNested
} from 'class-validator';
import { UserIdDto } from '@resources/users/dto';

@InputType()
export class CreateApplicationDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly title: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  readonly scheduledAt?: Date;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  readonly projectId?: number;

  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserIdDto)
  readonly reviewers?: UserIdDto[];
}
