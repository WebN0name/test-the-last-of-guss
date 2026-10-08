import { User } from '../../domain/user/entities/user';
import { UserRole } from '../../domain/user/value-objects/user-role';

export interface AccessTokenPayload {
  sub: string;
  login: string;
  role: UserRole;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ITokenService {
  signPair(user: User): Promise<TokenPair>;
  verifyAccess(token: string): Promise<AccessTokenPayload | null>;
  verifyRefresh(token: string): Promise<RefreshTokenPayload | null>;
}
