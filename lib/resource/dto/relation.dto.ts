import { Field, ID, InputType } from '@nestjs/graphql';
import { Expose } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class Relation {
  @Expose()
  @IsNotEmpty()
  @Field(() => ID)
  id: number;
}
