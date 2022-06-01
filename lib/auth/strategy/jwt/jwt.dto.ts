import { ObjectType } from '@nestjs/graphql';

export class JwtPayload {
  username: string;
  sub: string;
  iat: number;
  refresh?: boolean;
}

@ObjectType()
export class JwtToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
