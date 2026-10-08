import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ITokenService } from '../../../application/ports/token.port';
import { TOKEN_SERVICE } from '../../../domain/shared/tokens';
import { REFRESH_COOKIE } from '../cookies/auth-cookies';
import { cookieOf, RefreshRequest } from './authenticated-request';

@Injectable()
export class RefreshCookieGuard implements CanActivate {
  constructor(@Inject(TOKEN_SERVICE) private readonly tokens: ITokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = cookieOf(req, REFRESH_COOKIE);
    const payload = token ? await this.tokens.verifyRefresh(token) : null;
    if (!payload) throw new UnauthorizedException();
    (req as RefreshRequest).refreshUser = payload;
    return true;
  }
}
