import { roleForLogin } from './role-for-login';
import { UserRole } from '../value-objects/user-role';

describe('roleForLogin', () => {
  it.each(['admin', 'Admin', 'ADMIN', 'админ', ' admin '])('%s → admin', (login) => {
    expect(roleForLogin(login)).toBe(UserRole.Admin);
  });

  it.each(['Никита', 'никита', 'ниКиТа', 'nikita', 'NIKITA', 'Никитa'])('%s → nikita', (login) => {
    expect(roleForLogin(login)).toBe(UserRole.Nikita);
  });

  it.each(['nikita_2007', 'admin1', 'Иван', 'adm in', 'Никита Иванов'])('%s → survivor', (login) => {
    expect(roleForLogin(login)).toBe(UserRole.Survivor);
  });
});
