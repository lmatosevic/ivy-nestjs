import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Used only in auth controller to get user from login data
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
