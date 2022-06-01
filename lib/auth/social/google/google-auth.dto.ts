import { InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { Expose } from 'class-transformer';

@InputType()
export class GoogleAuth {
  @Expose()
  @IsNotEmpty()
  idToken: string;
}
