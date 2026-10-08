import { AccessTokenPayload, ITokenService, RefreshTokenPayload, TokenPair } from '../../application/ports/token.port';
import { User } from '../../domain/user/entities/user';

export class FakeTokenService implements ITokenService {
  readonly issued: User[] = [];

  async signPair(user: User): Promise<TokenPair> {
    this.issued.push(user);
    return { accessToken: `access:${user.id}`, refreshToken: `refresh:${user.id}` };
  }

  async verifyAccess(token: string): Promise<AccessTokenPayload | null> {
    const user = this.issued.find((u) => `access:${u.id}` === token);
    return user ? { sub: user.id, login: user.login, role: user.role, type: 'access' } : null;
  }

  async verifyRefresh(token: string): Promise<RefreshTokenPayload | null> {
    const user = this.issued.find((u) => `refresh:${u.id}` === token);
    return user ? { sub: user.id, type: 'refresh' } : null;
  }
}
