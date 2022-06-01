import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContext } from './request-context.model';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware<Request, Response> {
  use(req: Request, res: Response, next: NextFunction) {
    RequestContext.currentContext = new RequestContext(req, res);
    next();
  }
}
