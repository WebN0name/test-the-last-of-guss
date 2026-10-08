import { normalizeLogin } from './login-normalizer';
import { UserRole } from '../value-objects/user-role';

const ROLE_BY_NORMALIZED: ReadonlyMap<string, UserRole> = new Map([
  ['admin', UserRole.Admin],
  ['nikita', UserRole.Nikita],
]);

export function roleForLogin(login: string): UserRole {
  return ROLE_BY_NORMALIZED.get(normalizeLogin(login)) ?? UserRole.Survivor;
}
