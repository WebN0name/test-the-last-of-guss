import { User } from './user';
import { UserRole } from '../value-objects/user-role';

describe('User', () => {
  const now = new Date('2026-10-07T10:00:00Z');

  it('create назначает роль по имени', () => {
    const user = User.create({ id: 'u1', login: 'Admin', passwordHash: 'h', now });
    expect(user.role).toBe(UserRole.Admin);
    expect(user.login).toBe('Admin');
    expect(user.createdAt).toBe(now);
  });

  it('create сохраняет логин как введён, без нормализации', () => {
    const user = User.create({ id: 'u2', login: 'ниКиТа', passwordHash: 'h', now });
    expect(user.login).toBe('ниКиТа');
    expect(user.role).toBe(UserRole.Nikita);
  });

  it('restore не пересчитывает роль', () => {
    const user = User.restore({ id: 'u3', login: 'admin', passwordHash: 'h', role: UserRole.Survivor, createdAt: now });
    expect(user.role).toBe(UserRole.Survivor);
  });
});
