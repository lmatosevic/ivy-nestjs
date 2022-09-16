import { DynamicModule, Global, Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { EventEmitterModuleOptions } from '@nestjs/event-emitter/dist/interfaces';
import { EventService } from './event.service';
import { EVENTS_MODULE_OPTIONS } from './event.constants';

export type EventsModuleOptions = EventEmitterModuleOptions;

export const defaultEventsModuleOptions = {
  wildcard: true,
  delimiter: '.',
  newListener: false,
  removeListener: false,
  maxListeners: 100,
  verboseMemoryLeak: true,
  ignoreErrors: false
};

@Global()
@Module({})
export class EventModule {
  static forRoot(options: EventsModuleOptions = {}): DynamicModule {
    const resolvedOptions = Object.keys(options).length > 0 ? options : defaultEventsModuleOptions;
    return this.createModule(
      [
        {
          provide: EVENTS_MODULE_OPTIONS,
          useValue: resolvedOptions
        }
      ],
      [],
      resolvedOptions
    );
  }

  static createModule(
    providers: any[] = [],
    imports: any[] = [],
    options: EventsModuleOptions = {}
  ): DynamicModule {
    return {
      module: EventModule,
      imports: [
        ...imports,
        EventEmitterModule.forRoot(Object.keys(options).length > 0 ? options : defaultEventsModuleOptions)
      ],
      providers: [...providers, { provide: EventService, useExisting: EventEmitter2 }],
      exports: [EVENTS_MODULE_OPTIONS, EventEmitterModule, EventService]
    };
  }
}
