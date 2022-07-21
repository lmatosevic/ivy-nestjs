import { InputType } from '@nestjs/graphql';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { FileDto, IntegerIdDto } from 'ivy-nestjs';

@InputType()
export class CreateProjectDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name: string;

  @Expose()
  @IsOptional()
  @MaxLength(2047)
  readonly description?: string;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => IntegerIdDto)
  readonly owner?: IntegerIdDto;

  @Expose()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => IntegerIdDto)
  readonly plan: IntegerIdDto;

  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  readonly documents?: FileDto[];
}
