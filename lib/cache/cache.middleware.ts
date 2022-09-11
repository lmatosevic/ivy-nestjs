import { Inject, Injectable, NestMiddleware, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CacheService } from './cache.service';

@Injectable()
export class CacheMiddleware implements NestMiddleware<Request, Response> {
  constructor(@Optional() @Inject(CacheService) private cacheService: CacheService) {}

  use(req: Request, res: Response, next: NextFunction) {
    req['cacheManager'] = this.cacheService;
    next();
  }
}
