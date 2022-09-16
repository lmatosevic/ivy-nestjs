import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContextMiddleware } from './context.middleware';
import { Context } from './context';
import { EventModule, EventService } from '../event';

@Module({
  imports: [EventModule.forRoot()],
  providers: [ContextMiddleware],
  exports: [ContextMiddleware]
})
export class ContextModule implements NestModule {
  constructor(private configService: ConfigService, private eventService: EventService) {
    Context.config = this.configService;
    Context.event = this.eventService;
  }

  configure(consumer: MiddlewareConsumer): any {
    consumer.apply(ContextMiddleware).forRoutes('*');
  }
}
