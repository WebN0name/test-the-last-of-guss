import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ITokenService } from '../../../application/ports/token.port';
import { TOKEN_SERVICE } from '../../../domain/shared/tokens';
import { ACCESS_COOKIE } from '../cookies/auth-cookies';
import { AuthenticatedRequest, cookieOf } from './authenticated-request';

@Injectable()
export class JwtCookieGuard implements CanActivate {
  constructor(@Inject(TOKEN_SERVICE) private readonly tokens: ITokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = cookieOf(req, ACCESS_COOKIE);
    const payload = token ? await this.tokens.verifyAccess(token) : null;
    if (!payload) throw new UnauthorizedException();
    (req as AuthenticatedRequest).user = payload;
    return true;
  }
}
