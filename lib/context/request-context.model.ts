import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response } from 'express';

export class RequestContext {
  constructor(public readonly req: Request, public readonly res: Response) {}

  static context = new AsyncLocalStorage<RequestContext>();

  static get currentContext() {
    return this.context.getStore();
  }

  static set currentContext(cxt: RequestContext) {
    this.context.enterWith(cxt);
  }
}
