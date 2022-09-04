import { Inject, Injectable, NestMiddleware, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CacheService } from './cache.service';
import { CACHE_SERVICE } from './cache.constants';

@Injectable()
export class CacheMiddleware implements NestMiddleware<Request, Response> {
  constructor(@Optional() @Inject(CACHE_SERVICE) private cacheService: CacheService) {}

  use(req: Request, res: Response, next: NextFunction) {
    req['cacheManager'] = this.cacheService;
    next();
  }
}
