import { InputType } from '@nestjs/graphql';
import { Expose, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  ValidateNested
} from 'class-validator';
import { FileDto } from 'ivy-nestjs';

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
  @IsInt()
  readonly ownerId?: number;

  @Expose()
  @IsNotEmpty()
  @IsInt()
  readonly planId: number;

  @Expose()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  readonly documents?: FileDto[];
}
