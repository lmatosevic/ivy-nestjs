import { InputType } from '@nestjs/graphql';
import { Expose, Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { IntegerIdDto } from 'ivy-nestjs';

@InputType()
export class CreateCategoryDto {
  @Expose()
  @IsNotEmpty()
  @MaxLength(255)
  readonly name: string;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => IntegerIdDto)
  readonly parent?: IntegerIdDto;
}
