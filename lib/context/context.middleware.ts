import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Context } from './context';

@Injectable()
export class ContextMiddleware implements NestMiddleware<Request, Response> {
  use(req: Request, res: Response, next: NextFunction) {
    Context.currentRequest = new Context(req, res);
    next();
  }
}
