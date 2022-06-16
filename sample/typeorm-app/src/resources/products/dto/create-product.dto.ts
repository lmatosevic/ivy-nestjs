import { InputType } from '@nestjs/graphql';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, MaxLength, Min, ValidateNested } from 'class-validator';
import { FileDto } from 'ivy-nestjs/storage';

@InputType()
export class CreateProductDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(512)
  readonly name: string;

  @Expose()
  @IsNotEmpty()
  @MaxLength(4096)
  readonly description: string;

  @Expose()
  @IsInt()
  @Min(0)
  readonly price: number;

  @Expose()
  @IsOptional()
  @IsBoolean()
  readonly enabled?: boolean;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => FileDto)
  readonly pictures?: FileDto[];
}
