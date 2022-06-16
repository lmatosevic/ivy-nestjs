import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class InfoDto {
  name: string;
  description?: string;
  version: string;
  environment: string;
}
