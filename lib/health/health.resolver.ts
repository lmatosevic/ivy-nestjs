import { Query, Resolver } from '@nestjs/graphql';
import { HealthService } from './health.service';
import { HealthDto } from './health.dto';

@Resolver()
export class HealthResolver {
  constructor(private healthService: HealthService) {}

  @Query(() => HealthDto)
  async health(): Promise<HealthDto> {
    return (await this.healthService.allCheck()) as any;
  }
}
