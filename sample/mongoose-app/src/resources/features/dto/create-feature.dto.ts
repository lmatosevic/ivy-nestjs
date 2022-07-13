import { InputType } from '@nestjs/graphql';
import { Expose, Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { FileDto } from 'ivy-nestjs';

@InputType()
export class CreateFeatureDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name: string;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => FileDto)
  readonly file?: FileDto;
}
