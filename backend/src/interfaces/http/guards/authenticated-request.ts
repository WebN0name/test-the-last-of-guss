import { Request } from 'express';
import { AccessTokenPayload, RefreshTokenPayload } from '../../../application/ports/token.port';

export interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload;
}

export interface RefreshRequest extends Request {
  refreshUser: RefreshTokenPayload;
}

export function cookieOf(req: Request, name: string): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
