import { Inject, Injectable, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Action } from '../../enums';
import { CacheService } from '../cache.service';

@Injectable()
export class CacheListener {
  constructor(@Optional() @Inject(CacheService) private cacheService: CacheService) {}

  @OnEvent('cache.expireOnChange', { async: true })
  async handleExpireOnChange(event: { resource: string; action: Action }) {
    await this.cacheService?.expireOnChange(event.resource, event.action);
  }
}
