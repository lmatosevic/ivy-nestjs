import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModuleOptions } from '../../auth.module';
import { AuthorizationError } from '../../errors';
import { AUTH_MODULE_OPTIONS } from '../../auth.constants';
import { JwtPayload } from './jwt.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @Inject(AUTH_MODULE_OPTIONS) private authModuleOptions: AuthModuleOptions,
    private configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        authModuleOptions.jwt?.secret ??
        configService.get('auth.jwt.secret') ??
        !configService.get('auth.jwt.enabled')
          ? 'secret'
          : undefined
    });
  }

  async validate(payload: JwtPayload) {
    let user;
    try {
      user = await this.authModuleOptions.userDetailsService.findById(payload.sub);
    } catch (e) {
      this.logger.warn(e);
      throw new AuthorizationError('Unauthorized', 401);
    }

    if (!user || !user.enabled || (user.logoutAt && user.logoutAt.getTime() > payload.iat)) {
      throw new AuthorizationError('Unauthorized', 401);
    }

    return user;
  }
}
