import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport';

@Injectable()
export class ApikeyStrategy extends PassportStrategy(Strategy, 'apikey') {
  constructor() {
    super();
  }

  authenticate() {
    return this.success({});
  }
}
