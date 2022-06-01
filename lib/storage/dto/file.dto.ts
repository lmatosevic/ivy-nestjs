import { InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

@InputType()
export class FileDto {
  @Expose()
  @IsNotEmpty()
  data: string;

  @Expose()
  @IsOptional()
  originalName?: string;

  @Expose()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @Expose()
  @IsOptional()
  @MaxLength(4096)
  description?: string;
}
