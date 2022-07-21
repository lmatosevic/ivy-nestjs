import { InputType } from '@nestjs/graphql';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { PersistFeatureDto } from '@resources/features/dto';
import { FileDto } from 'ivy-nestjs';

@InputType()
export class CreatePlanDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name: string;

  @Expose()
  @IsOptional()
  @IsInt()
  readonly projectId?: number;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersistFeatureDto)
  readonly features?: PersistFeatureDto[];

  @Expose()
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  readonly files?: FileDto[];
}
