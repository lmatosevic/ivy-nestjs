import { InputType } from '@nestjs/graphql';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsDateString, IsNotEmpty, IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { IntegerIdDto } from 'ivy-nestjs';

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
  @ValidateNested()
  @Type(() => IntegerIdDto)
  readonly project: IntegerIdDto;

  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntegerIdDto)
  readonly reviewers?: IntegerIdDto[];

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => IntegerIdDto)
  readonly category?: IntegerIdDto;
}
