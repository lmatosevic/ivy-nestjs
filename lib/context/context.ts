import { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response } from 'express';
import { EventService } from '../event';

export class Context {
  constructor(
    public readonly req: Request,
    public readonly res: Response
  ) {}

  static context = new AsyncLocalStorage<Context>();

  static config: ConfigService;

  static event: EventService;

  static get currentRequest() {
    return this.context.getStore();
  }

  static set currentRequest(cxt: Context) {
    this.context.enterWith(cxt);
  }
}
