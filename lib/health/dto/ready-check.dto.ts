import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ReadyCheckDto {
  ready: boolean;
}
