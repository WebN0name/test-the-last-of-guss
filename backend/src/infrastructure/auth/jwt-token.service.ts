import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenPayload, ITokenService, RefreshTokenPayload, TokenPair } from '../../application/ports/token.port';
import { User } from '../../domain/user/entities/user';
import { UserRole } from '../../domain/user/value-objects/user-role';
import { Env } from '../config/env';

const ROLES = new Set<string>(Object.values(UserRole));

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly env: Env,
  ) {}

  async signPair(user: User): Promise<TokenPair> {
    const accessPayload: AccessTokenPayload = { sub: user.id, login: user.login, role: user.role, type: 'access' };
    const refreshPayload: RefreshTokenPayload = { sub: user.id, type: 'refresh' };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.env.JWT_ACCESS_SECRET,
        expiresIn: this.env.JWT_ACCESS_TTL,
        algorithm: 'HS256',
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.env.JWT_REFRESH_SECRET,
        expiresIn: this.env.JWT_REFRESH_TTL,
        algorithm: 'HS256',
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async verifyAccess(token: string): Promise<AccessTokenPayload | null> {
    const payload = await this.verify(token, this.env.JWT_ACCESS_SECRET);
    if (!payload || payload.type !== 'access') return null;
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.login !== 'string' ||
      typeof payload.role !== 'string' ||
      !ROLES.has(payload.role)
    )
      return null;
    return { sub: payload.sub, login: payload.login, role: payload.role as UserRole, type: 'access' };
  }

  async verifyRefresh(token: string): Promise<RefreshTokenPayload | null> {
    const payload = await this.verify(token, this.env.JWT_REFRESH_SECRET);
    if (!payload || payload.type !== 'refresh' || typeof payload.sub !== 'string') return null;
    return { sub: payload.sub, type: 'refresh' };
  }

  private async verify(token: string, secret: string): Promise<Record<string, unknown> | null> {
    try {
      return await this.jwt.verifyAsync<Record<string, unknown>>(token, { secret, algorithms: ['HS256'] });
    } catch {
      return null;
    }
  }
}
