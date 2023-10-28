import { MiddlewareConsumer, Module, NestModule, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContextMiddleware } from './context.middleware';
import { Context } from './context';
import { EventModule, EventService } from '../event';
import { CacheService } from '../cache';

@Module({
  imports: [EventModule.forRoot()],
  providers: [ContextMiddleware],
  exports: [ContextMiddleware]
})
export class ContextModule implements NestModule {
  constructor(
    private configService: ConfigService,
    private eventService: EventService,
    @Optional() private cacheService: CacheService
  ) {
    Context.config = this.configService;
    Context.event = this.eventService;
    Context.cache = this.cacheService;
  }

  configure(consumer: MiddlewareConsumer): any {
    consumer.apply(ContextMiddleware).forRoutes('*');
  }
}
