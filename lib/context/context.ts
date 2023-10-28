import { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response } from 'express';
import { EventService } from '../event';
import { CacheService } from '../cache';

export class Context {
  constructor(
    public readonly req: Request,
    public readonly res: Response
  ) {}

  static context = new AsyncLocalStorage<Context>();

  static config: ConfigService;

  static event: EventService;

  static cache?: CacheService;

  static get currentRequest() {
    return this.context.getStore();
  }

  static set currentRequest(cxt: Context) {
    this.context.enterWith(cxt);
  }
}
