import { InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class StringIdDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  readonly id: string;
}
