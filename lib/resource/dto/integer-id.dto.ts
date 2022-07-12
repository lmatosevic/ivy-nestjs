import { InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

@InputType()
export class IntegerIdDto {
  @Expose()
  @IsInt()
  @IsNotEmpty()
  readonly id: number;
}
