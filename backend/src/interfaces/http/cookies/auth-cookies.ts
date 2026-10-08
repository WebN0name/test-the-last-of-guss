import { CookieOptions, Response } from 'express';
import { TokenPair } from '../../../application/ports/token.port';
import { Env } from '../../../infrastructure/config/env';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const ACCESS_PATH = '/api';
export const REFRESH_PATH = '/api/auth/refresh';

function base(env: Env): CookieOptions {
  return { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'strict' };
}

export function setAuthCookies(res: Response, tokens: TokenPair, env: Env): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...base(env), path: ACCESS_PATH, maxAge: env.JWT_ACCESS_TTL * 1000 });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base(env),
    path: REFRESH_PATH,
    maxAge: env.JWT_REFRESH_TTL * 1000,
  });
}

export function clearAuthCookies(res: Response, env: Env): void {
  res.clearCookie(ACCESS_COOKIE, { ...base(env), path: ACCESS_PATH });
  res.clearCookie(REFRESH_COOKIE, { ...base(env), path: REFRESH_PATH });
}
