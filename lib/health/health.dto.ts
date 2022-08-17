import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class HealthDto {
  status: string;
  info: HealthStatusDto;
  details: HealthStatusDto;
  error: HealthStatusDto;
}

@ObjectType()
export class HealthStatusDto {
  database: StatusDto;
  memory: StatusDto;
  storage: StatusDto;
  mail?: StatusDto;
}

@ObjectType()
export class StatusDto {
  status: string;
}
