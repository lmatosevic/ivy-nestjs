import { InputType } from '@nestjs/graphql';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsNotEmpty, MaxLength, ValidateNested } from 'class-validator';
import { UpdateFeatureDto } from '@resources/features/dto';
import { FileDto } from 'ivy-nestjs';

@InputType()
export class CreatePlanDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name: string;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFeatureDto)
  readonly features?: UpdateFeatureDto[];

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  readonly files?: FileDto[];
}
