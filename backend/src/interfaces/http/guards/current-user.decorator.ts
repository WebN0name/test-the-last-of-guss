import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccessTokenPayload } from '../../../application/ports/token.port';
import { AuthenticatedRequest } from './authenticated-request';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AccessTokenPayload => {
  return ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
});
