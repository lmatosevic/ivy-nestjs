import { InputType } from '@nestjs/graphql';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsHexadecimal, IsNotEmpty, IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { FileDto } from 'ivy-nestjs/storage';

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
  @IsHexadecimal()
  readonly owner: string;

  @Expose()
  @IsNotEmpty()
  @IsHexadecimal()
  readonly plan: string;

  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  readonly documents?: FileDto[];

  @Expose()
  @IsOptional()
  readonly score?: number;
}
