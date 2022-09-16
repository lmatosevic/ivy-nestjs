import { EventEmitter2 } from '@nestjs/event-emitter';
import { Inject, Injectable } from '@nestjs/common';
import { EVENTS_MODULE_OPTIONS } from './event.constants';
import { EventsModuleOptions } from './event.module';

@Injectable()
export class EventService extends EventEmitter2 {
  constructor(@Inject(EVENTS_MODULE_OPTIONS) private eventsModuleOptions: EventsModuleOptions) {
    super(eventsModuleOptions);
  }
}
