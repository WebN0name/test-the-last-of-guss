import { User } from '../../../domain/user/entities/user';
import { UserRole } from '../../../domain/user/value-objects/user-role';
import { InvalidCredentialsError } from '../../../domain/user/errors/user.errors';
import { FakePasswordHasher } from '../../../test-support/fakes/fake-password-hasher';
import { FakeTokenService } from '../../../test-support/fakes/fake-token.service';
import { FakeUserRepository } from '../../../test-support/fakes/fake-user.repository';
import { FixedClock } from '../../../test-support/fakes/fixed-clock';
import { LoginCommand } from '../commands/login.command';
import { LoginHandler } from './login.handler';

describe('LoginHandler', () => {
  let users: FakeUserRepository;
  let tokens: FakeTokenService;
  let handler: LoginHandler;
  const now = new Date('2026-10-07T10:00:00Z');

  beforeEach(() => {
    users = new FakeUserRepository();
    tokens = new FakeTokenService();
    handler = new LoginHandler(users, new FakePasswordHasher(), tokens, new FixedClock(now));
  });

  it('неизвестное имя → создаёт пользователя с ролью по имени, created=true', async () => {
    const result = await handler.execute(new LoginCommand('Admin', 'pass-1'));
    expect(result.created).toBe(true);
    expect(result.user.role).toBe(UserRole.Admin);
    expect(result.user.passwordHash).toBe('hashed:pass-1');
    expect(result.tokens.accessToken).toBe(`access:${result.user.id}`);
    expect(await users.findByLogin('Admin')).not.toBeNull();
  });

  it('известное имя и верный пароль → вход, created=false, второй пользователь не создаётся', async () => {
    await handler.execute(new LoginCommand('Иван', 'pw'));
    const result = await handler.execute(new LoginCommand('Иван', 'pw'));
    expect(result.created).toBe(false);
    expect(users.byLogin.size).toBe(1);
  });

  it('известное имя и неверный пароль → InvalidCredentialsError', async () => {
    await handler.execute(new LoginCommand('Иван', 'pw'));
    await expect(handler.execute(new LoginCommand('Иван', 'wrong'))).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('гонка первого входа: конфликт при insert → повторный вход с тем же паролем успешен', async () => {
    const winner = User.create({ id: 'w', login: 'Иван', passwordHash: 'hashed:pw', now });
    users.conflictOnNextInsert = winner;
    const result = await handler.execute(new LoginCommand('Иван', 'pw'));
    expect(result.created).toBe(false);
    expect(result.user.id).toBe('w');
  });

  it('гонка первого входа с другим паролем → InvalidCredentialsError', async () => {
    users.conflictOnNextInsert = User.create({ id: 'w', login: 'Иван', passwordHash: 'hashed:other', now });
    await expect(handler.execute(new LoginCommand('Иван', 'pw'))).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
