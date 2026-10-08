import { TokenPair } from '../../ports/token.port';
import { User } from '../../../domain/user/entities/user';

export interface AuthResult {
  user: User;
  tokens: TokenPair;
  created: boolean;
}
