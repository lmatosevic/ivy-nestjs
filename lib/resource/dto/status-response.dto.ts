import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class StatusResponse {
  success: boolean;

  message?: string;
}
