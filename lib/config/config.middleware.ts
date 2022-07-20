import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigMiddleware implements NestMiddleware<Request, Response> {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    req['config'] = this.configService;
    next();
  }
}
